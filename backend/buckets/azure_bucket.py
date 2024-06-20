import os
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.core.exceptions import ResourceNotFoundError
from datetime import datetime, timedelta
from azure.storage.blob import CorsRule


storage_account_name = os.getenv("AZURE_STORAGE_ACCOUNT")
storage_account_key = os.getenv("AZURE_STORAGE_KEY")

blob_service_client = BlobServiceClient(
    account_url=f"https://{storage_account_name}.blob.core.windows.net", credential=storage_account_key)

cors = CorsRule(
    allowed_origins=['*'],
    allowed_methods=['GET', 'POST', 'PUT'],
    allowed_headers=['*'],
    exposed_headers=['*'],
    max_age_in_seconds=3600
)
blob_service_client.set_service_properties(cors=[cors])


def create_bucket(bucket_name):
    blob_service_client.create_container(bucket_name)


def generate_presigned_url(bucket_name: str, blob_path: str, write_only=False, expiration=36000) -> str:
    expiry_time = datetime.utcnow() + timedelta(seconds=expiration)
    if blob_path.startswith('/'):
        blob_path = blob_path[1:]

    sas_token = generate_blob_sas(account_name=storage_account_name,
                                  account_key=storage_account_key,
                                  container_name=bucket_name,
                                  blob_name=blob_path,
                                  permission=BlobSasPermissions(
                                      read=not write_only, write=write_only),
                                  expiry=expiry_time)

    blob_url_with_sas = f"https://{storage_account_name}.blob.core.windows.net/{bucket_name}/{blob_path}?{sas_token}"

    return blob_url_with_sas


def blob_exists(bucket_name: str, blob_path: str) -> bool:
    container_client = blob_service_client.get_container_client(
        container=bucket_name)
    if blob_path.startswith("/"):
        blob_path = blob_path[1:]

    try:
        blob_client = container_client.get_blob_client(blob=blob_path)
        blob_client.get_blob_properties()
        # exist
        return True
    except ResourceNotFoundError:
        # not exist
        return False
