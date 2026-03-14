from database.connection import domains_col

DOMAINS = [
    {"category": "Technology & Development", "domains": [
        "Web Development", "Frontend Dev", "Backend Dev", "Full Stack Dev",
        "Mobile Dev (Android)", "Mobile Dev (iOS)", "Cross-platform (Flutter/RN)",
        "Game Development", "DevOps / CI-CD", "Cloud Architecture (AWS/GCP/Azure)",
        "Blockchain / Web3", "Smart Contracts", "Embedded Systems / IoT",
        "Desktop App Dev", "API / Integration Dev", "QA / Test Automation",
        "Database Admin", "Cybersecurity", "Ethical Hacking / Pen Testing"
    ]},
    {"category": "AI & Data", "domains": [
        "Machine Learning", "Deep Learning", "NLP / LLMs", "Computer Vision",
        "Data Science", "Data Analysis", "Data Engineering", "Business Intelligence",
        "AI Agent Development", "Prompt Engineering", "Web Scraping / Automation"
    ]},
    {"category": "Design & Creative", "domains": [
        "UI / UX Design", "Graphic Design", "Brand Identity", "Logo Design",
        "Motion Graphics", "Video Editing", "3D Modeling / Animation",
        "Product Design", "Illustration", "Infographic Design",
        "Thumbnail Design", "Photography", "Photo Editing / Retouching", "AR / VR Design"
    ]},
    {"category": "Writing & Content", "domains": [
        "Copywriting", "Technical Writing", "Content Writing", "Blog / Article Writing",
        "SEO Writing", "Script Writing", "Ghostwriting", "Proofreading / Editing",
        "Resume / CV Writing", "Grant Writing", "Academic Writing",
        "UX Writing", "Social Media Content"
    ]},
    {"category": "Marketing & Business", "domains": [
        "Digital Marketing", "SEO / SEM", "Social Media Marketing", "Email Marketing",
        "Performance Marketing", "Influencer Marketing", "Market Research",
        "Brand Strategy", "Growth Hacking", "Affiliate Marketing",
        "E-commerce Management", "Product Management"
    ]},
    {"category": "Finance, Legal & Operations", "domains": [
        "Accounting / Bookkeeping", "Financial Modelling", "Tax Consulting",
        "Legal Consulting", "Contract Drafting", "HR / Recruitment",
        "Business Analysis", "Project Management", "Virtual Assistance", "Data Entry",
        "Customer Support"
    ]},
    {"category": "Education, Audio & Others", "domains": [
        "Online Tutoring", "Curriculum Design", "Podcast Production", "Voice Over",
        "Music Production", "Sound Design", "Translation / Localization",
        "Transcription", "Architecture / CAD", "Interior Design",
        "Fashion Design", "Research & Development"
    ]},
]

def seed_domains():
    if domains_col.count_documents({}) == 0:
        all_domains = []
        for cat in DOMAINS:
            for d in cat["domains"]:
                all_domains.append({"name": d, "category": cat["category"]})
        domains_col.insert_many(all_domains)
        print(f"Seeded {len(all_domains)} domains")
    else:
        print("Domains already seeded")

if __name__ == "__main__":
    seed_domains()
