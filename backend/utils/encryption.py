from cryptography.fernet import Fernet
import os, base64

def get_fernet():
    key = os.getenv("ENCRYPTION_KEY", "")
    if not key:
        # Generate a key for first run — paste the output into .env
        key = Fernet.generate_key().decode()
        print(f"[WARN] No ENCRYPTION_KEY found. Generated one — add to .env: {key}")
    # Ensure key is valid Fernet format (32 url-safe base64 bytes)
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        key = base64.urlsafe_b64encode(key.encode()[:32].ljust(32, b'0'))
        return Fernet(key)

_fernet = None

def fernet():
    global _fernet
    if _fernet is None:
        _fernet = get_fernet()
    return _fernet

def encrypt(value: str) -> str:
    if not value:
        return ""
    return fernet().encrypt(value.encode()).decode()

def decrypt(token: str) -> str:
    if not token:
        return ""
    return fernet().decrypt(token.encode()).decode()

def encrypt_bank_details(details: dict) -> dict:
    sensitive_fields = ["account_number", "ifsc", "pan", "upi_id", "gst"]
    encrypted = dict(details)
    for field in sensitive_fields:
        if field in encrypted and encrypted[field]:
            encrypted[field] = encrypt(encrypted[field])
    return encrypted

def decrypt_bank_details(details: dict) -> dict:
    sensitive_fields = ["account_number", "ifsc", "pan", "upi_id", "gst"]
    decrypted = dict(details)
    for field in sensitive_fields:
        if field in decrypted and decrypted[field]:
            try:
                decrypted[field] = decrypt(decrypted[field])
            except Exception:
                decrypted[field] = "[decryption error]"
    return decrypted
