import hashlib
import hmac
import os


def generate_anon_id(fingerprint):
    return hashlib.sha256((fingerprint + os.environ["ANON_SALT"]).encode("utf-8")).hexdigest()


def generate_audit_signature(payload):
    return hmac.new(
        os.environ["ENCLAVE_KEY"].encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
