import boto3
import os

"""
The Chameleon object store can be accessed via S3 compatible client libraries.
1.) Run "openstack ec2 credential create"/"openstack ec2 credentials list" to either generate or list ec2 compatible credentials.
2.) Set the returned "Access" and "Secret" keys as environment vars for this script to use.
3.) All functionality required by this interface should be supported.

TODO: The indvidual functions here have been tested independently, verify that this still works when used by the deploy script.

TODO: Most of the code here is identical to aws_bucket.py, consolidate into a single file for the s3 interface (Used for both AWS and Chameleon).
"""

# Initialize a session using your Chameleon EC2 credentials
CHAMELEON_ACCESS_KEY = os.getenv("CHAMELEON_ACCESS_KEY")
CHAMELEON_SECRET_KEY = os.getenv("CHAMELEON_SECRET_KEY")
CHAMELEON_REGION = None
chameleon_client = boto3.client(
    "s3",
    aws_access_key_id=CHAMELEON_ACCESS_KEY,
    aws_secret_access_key=CHAMELEON_SECRET_KEY,
    region_name=CHAMELEON_REGION,
    endpoint_url="https://chi.tacc.chameleoncloud.org:7480"
)


# Create a new S3 bucket
def create_bucket(bucket_name):
    chameleon_client.create_bucket(
        Bucket=bucket_name)

    # Define the configuration rules
    cors_configuration = {
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["PUT", "POST", "GET"],
                "AllowedOrigins": ["*"],
                "ExposeHeaders": ["Access-Control-Allow-Origin"],
                "MaxAgeSeconds": 3000,
            }
        ]
    }

    chameleon_client.put_bucket_cors(
        Bucket=bucket_name, CORSConfiguration=cors_configuration
    )


def get_bucket_cors(bucket_name):
    """Retrieve the CORS configuration rules of an Amazon S3 bucket

    :param bucket_name: string
    :return: List of the bucket's CORS configuration rules. If no CORS
    configuration exists, return empty list. If error, return None.
    """

    # Retrieve the CORS configuration
    try:
        response = chameleon_client.get_bucket_cors(Bucket=bucket_name)
    except e:
        if e.response["Error"]["Code"] == "NoSuchCORSConfiguration":
            return []
        else:
            return None
    return response["CORSRules"]


def generate_presigned_url(
    bucket_name: str, blob_path: str, write_only=False, expiration=36000
) -> str:
    """Generate a presigned URL to share an S3 object with a PUT operation for a specific subpath"""
    # Ensure the subpath ends with a '/' if it's not empty and does not already end with one
    # print("CORS Rules")
    # print(get_bucket_cors(bucket_name))

    perm = "get_object"
    if write_only:
        perm = "put_object"

    response = chameleon_client.generate_presigned_url(
        perm,
        Params={
            "Bucket": bucket_name,
            "Key": blob_path
        },
        ExpiresIn=expiration
    )

    return response


def delete_bucket(bucket_name):
    # delete all objects first
    bucket = boto3.resource("s3").Bucket(bucket_name)
    bucket.objects.all().delete()

    try:
        chameleon_client.delete_bucket(Bucket=bucket_name)
    except chameleon_client.exceptions.ClientError as e:
        print(f"Cannot delete bucket {bucket_name}: {e}")


def blob_exists(bucket_name: str, blob_path: str) -> bool:
    try:
        chameleon_client.head_object(Bucket=bucket_name, Key=blob_path)
        # exist
        return True
    except chameleon_client.exceptions.ClientError as e:
        # if not exist，will return '404'
        if e.response["Error"]["Code"] == "404":
            return False
        else:
            # other error
            raise


if __name__ == "__main__":
    bucket_name = "chameleon-test-container"
    try:
        create_bucket(bucket_name)
    except Exception as e:
        print(e)

    try:
        presigned_url = generate_presigned_url(
            bucket_name, "secret_shares", True)
        print(presigned_url)
    except Exception as e:
        print(e)

    # delete_bucket(bucket_name)
