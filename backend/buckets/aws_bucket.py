import boto3
import os


# Initialize a session using your AWS credentials
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_REGION = "us-east-2"
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION,
    endpoint_url=f'https://s3.{AWS_REGION}.amazonaws.com'
)


# Create a new S3 bucket
def create_bucket(bucket_name):
    location = {"LocationConstraint": s3_client.meta.region_name}
    s3_client.create_bucket(
        Bucket=bucket_name, CreateBucketConfiguration=location)

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

    s3_client.put_bucket_cors(
        Bucket=bucket_name, CORSConfiguration=cors_configuration
    )


def get_bucket_cors(bucket_name):
    """Retrieve the CORS configuration rules of an Amazon S3 bucket

    :param bucket_name: string
    :return: List of the bucket's CORS configuration rules. If no CORS
    configuration exists, return empty list. If error, return None.
    """

    # Retrieve the CORS configuration
    s3_client
    try:
        response = s3_client.get_bucket_cors(Bucket=bucket_name)
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
        return s3_client.generate_presigned_post(Bucket=bucket_name, Key=blob_path)

    response = s3_client.generate_presigned_url(
        perm, Params={"Bucket": bucket_name, "Key": blob_path}, ExpiresIn=expiration
    )

    return response


def delete_bucket(bucket_name):
    # delete all objects first
    bucket = boto3.resource("s3").Bucket(bucket_name)
    bucket.objects.all().delete()

    try:
        s3_client.delete_bucket(Bucket=bucket_name)
    except s3_client.exceptions.ClientError as e:
        print(f"Cannot delete bucket {bucket_name}: {e}")


def blob_exists(bucket_name: str, blob_path: str) -> bool:
    try:
        s3_client.head_object(Bucket=bucket_name, Key=blob_path)
        # exist
        return True
    except s3_client.exceptions.ClientError as e:
        # if not exist，will return '404'
        if e.response["Error"]["Code"] == "404":
            return False
        else:
            # other error
            raise


if __name__ == "__main__":
    bucket_name = "aws-test-tva"
    try:
        create_bucket(bucket_name)
    except Exception as e:
        print(e)
        exit(1)

    try:
        presigned_url = generate_presigned_url(
            bucket_name, "secret_shares", "/", True)
        print(presigned_url)
    except Exception as e:
        print(e.format_exc())
        exit(1)

    # delete_bucket(bucket_name)
