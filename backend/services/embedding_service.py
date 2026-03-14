"""
Embedding-based smart search service.
Uses sentence-transformers to convert project descriptions and freelancer
profiles into vector embeddings, then ranks by cosine similarity.
This replaces dumb keyword search with semantic understanding.
"""

import numpy as np
import joblib
import os
from pathlib import Path

# Lazy-load the model so startup is fast
_model = None
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"  # 80MB, fast, good quality
EMBED_CACHE_PATH = Path(__file__).parent.parent / "ml_models" / "embedder.joblib"

def get_embedder():
    """Load sentence-transformer model. Downloads once, caches to disk."""
    global _model
    if _model is not None:
        return _model

    # Try loading cached version first
    if EMBED_CACHE_PATH.exists():
        print("[ML] Loading cached embedder from disk...")
        _model = joblib.load(EMBED_CACHE_PATH)
        return _model

    # Download and cache
    print(f"[ML] Downloading {EMBED_MODEL_NAME} (first run only)...")
    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer(EMBED_MODEL_NAME)
    EMBED_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(_model, EMBED_CACHE_PATH)
    print("[ML] Embedder cached.")
    return _model


def embed_text(text: str) -> np.ndarray:
    """Convert text to a 384-dim embedding vector."""
    model = get_embedder()
    return model.encode(text, normalize_embeddings=True)


def embed_freelancer_profile(freelancer: dict) -> np.ndarray:
    """
    Build a rich text representation of a freelancer and embed it.
    Combines domains, skills, bio and experience into one vector.
    """
    parts = []
    if freelancer.get("domains"):
        parts.append("Domains: " + ", ".join(freelancer["domains"]))
    if freelancer.get("sub_skills"):
        skills = freelancer["sub_skills"]
        if isinstance(skills, list):
            parts.append("Skills: " + ", ".join(skills))
    if freelancer.get("bio"):
        parts.append(freelancer["bio"])
    if freelancer.get("years_experience"):
        parts.append(f"{freelancer['years_experience']} years experience")
    if freelancer.get("portfolio_links"):
        parts.append("Portfolio available")

    text = " | ".join(parts) if parts else "freelancer"
    return embed_text(text)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two normalized vectors."""
    if a is None or b is None:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


def rank_freelancers_by_embedding(
    project_description: str,
    freelancers: list,
    min_pfi: float = 0,
    top_k: int = 10
) -> list:
    """
    Rank freelancers by semantic similarity to the project description.
    Combines embedding similarity (60%) with PFI score (40%) for final rank.

    Args:
        project_description: The employer's project description
        freelancers: List of freelancer dicts from MongoDB
        min_pfi: Minimum PFI score filter
        top_k: How many to return

    Returns:
        Sorted list with match_score and similarity_score added
    """
    if not freelancers:
        return []

    print(f"[ML] Ranking {len(freelancers)} freelancers by embedding similarity...")
    project_vec = embed_text(project_description)

    scored = []
    for f in freelancers:
        # Filter by PFI
        pfi = f.get("pfi_score", 70.0)
        if pfi < min_pfi:
            continue

        # Semantic similarity
        profile_vec = embed_freelancer_profile(f)
        sim = cosine_similarity(project_vec, profile_vec)

        # Normalize PFI to 0-1
        pfi_norm = min(pfi / 100.0, 1.0)

        # Combined score: 60% semantic, 40% PFI reputation
        combined = (sim * 0.60) + (pfi_norm * 0.40)

        scored.append({
            **f,
            "similarity_score": round(sim * 100, 1),
            "match_score": round(combined * 100, 1),
        })

    # Sort by combined score descending
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    result = scored[:top_k]
    print(f"[ML] Top match score: {result[0]['match_score'] if result else 0}")
    return result


def find_similar_projects(description: str, all_projects: list, top_k: int = 5) -> list:
    """Find historically similar completed projects — useful for milestone suggestions."""
    if not all_projects:
        return []
    query_vec = embed_text(description)
    scored = []
    for p in all_projects:
        p_vec = embed_text(p.get("project_description", ""))
        sim = cosine_similarity(query_vec, p_vec)
        scored.append({**p, "similarity": round(sim * 100, 1)})
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_k]
