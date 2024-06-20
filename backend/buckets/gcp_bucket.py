import os
from google.cloud import storage

os.environ["CRYPTOGRAPHY_OPENSSL_NO_LEGACY"] = "1"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS_FILE_PATH")

storage_client = storage.Client()


def create_bucket(bucket_name):
    bucket = storage_client.bucket(bucket_name)
    bucket = storage_client.create_bucket(bucket)

    # setup cors
    cors_configuration = [{
        "origin": ["*"],
        # "responseHeader": ["Content-Type",  "Access-Control-Allow-Headers", "x-goog-resumable"],
        "responseHeader": ["*"],
        "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
        "maxAgeSeconds": 3600
    }]

    bucket.cors = cors_configuration
    bucket.patch()


def generate_presigned_url(bucket_name: str, blob_path: str, write_only=False, expiration=36000) -> str:
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    method = "GET"
    if write_only:
        method = "PUT"

    url = blob.generate_signed_url(
        version="v4",
        expiration=expiration,
        method=method
    )

    return url


def blob_exists(bucket_name: str, blob_path: str) -> bool:
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    return blob.exists()
