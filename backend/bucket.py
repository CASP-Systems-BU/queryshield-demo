from enum import Enum
from typing import DefaultDict, List, Optional

from analysis_metadata import CloudProvider
import buckets.aws_bucket as aws_bucket
import buckets.gcp_bucket as gcp_bucket
import buckets.azure_bucket as azure_bucket
import buckets.chameleon_bucket as chameleon_bucket


class BucketType(Enum):
    Input = "in"
    Output = "out"

    @classmethod
    def from_str(cls, value: str) -> 'BucketType':
        for member in cls:
            if member.value.lower() == value.lower():
                return member
        raise ValueError(f"{value} is not a valid {cls.__name__}")


class Bucket:
    def __init__(self, job_id: str, cloud_provider: CloudProvider, bucket_type: BucketType, suffix: str) -> None:
        self.job_id: str = job_id
        self.cloud_provider: CloudProvider = cloud_provider
        self.bucket_type: BucketType = bucket_type
        self.suffix = suffix

        self.name = f"queryshield-{self.bucket_type.value}-{self.job_id}-{self.suffix}"

    def create_on_cloud(self) -> None:
        switcher = {
            CloudProvider.AWS: aws_bucket.create_bucket,
            CloudProvider.GCP: gcp_bucket.create_bucket,
            CloudProvider.AZURE: azure_bucket.create_bucket,
            CloudProvider.CHAMELEON: chameleon_bucket.create_bucket,
        }

        func = switcher[self.cloud_provider]
        func(self.name)

    def generate_presigned_url(self, blob_path: str, write_only: bool = False) -> str:
        switcher = {
            CloudProvider.AWS: aws_bucket.generate_presigned_url,
            CloudProvider.GCP: gcp_bucket.generate_presigned_url,
            CloudProvider.AZURE: azure_bucket.generate_presigned_url,
            CloudProvider.CHAMELEON: chameleon_bucket.generate_presigned_url,
        }

        func = switcher[self.cloud_provider]
        return func(self.name, blob_path, write_only)

    def blob_exists(self, blob_path: str) -> bool:
        switcher = {
            CloudProvider.AWS: aws_bucket.blob_exists,
            CloudProvider.GCP: gcp_bucket.blob_exists,
            CloudProvider.AZURE: azure_bucket.blob_exists,
            CloudProvider.CHAMELEON: chameleon_bucket.blob_exists,
        }

        func = switcher[self.cloud_provider]
        return func(self.name, blob_path)


class BucketUtils:
    @staticmethod
    def filter_buckets(buckets: List[Bucket], cloud_provider: Optional[CloudProvider] = None, bucket_type: Optional[BucketType] = None, suffix: Optional[str] = None) -> List[Bucket]:
        """
        Filters a list of bucket based on the specified cloud provider and type.

        Parameters:
        - buckets (List[Bucket]): List of all buckets.
        - cloud_provider (CloudProvider, optional): The cloud provider to filter by. Default is None.
        - type (BucketType, optional): The type of buckets to filter by. Default is None.

        Returns:
        - List[Bucket]: A list of filtered buckets.
        """
        filtered_buckets = []
        for bucket in buckets:
            if cloud_provider and bucket.cloud_provider != cloud_provider:
                continue
            if bucket_type and bucket.bucket_type != bucket_type:
                continue
            if suffix and str(bucket.suffix) != str(suffix):
                continue
            filtered_buckets.append(bucket)
        return filtered_buckets

    @staticmethod
    def get_presigned_urls(buckets: List[Bucket], blob_path: str, write_only=False) -> List[str]:
        """
        This function will generate read_only presigned urls by default.
        If want to generate write_only urls, please set write_only=True.   
        """
        presigned_urls = []

        for bucket in buckets:
            presigned_url = bucket.generate_presigned_url(
                blob_path, write_only)
            presigned_urls.append(presigned_url)

        return presigned_urls

    @staticmethod
    def blob_exists_in_all_buckets(buckets: List[Bucket], blob_path: str) -> bool:
        """
        Check if the blob exists in all buckets
        """
        for bucket in buckets:
            if not bucket.blob_exists(blob_path):
                return False

        return True

    @staticmethod
    def init_buckets_for_instances(job_id: str, instances_per_cloud: DefaultDict[CloudProvider, int]) -> List[Bucket]:
        # for each vm instance not cloud provider, create an input bucket and an output bucket.
        # e.g. if there are 3 aws ec2 instances, there should be 3 input buckets and 3 output buckets in S3.
        # e.g. init_buckets_for_instances(["aws", "gcp"], 3))  # Output: ['aws-0', 'gcp-0', 'aws-1']
        # e.g. init_buckets_for_instances(["aws", "gcp", "azure"],, 3))  # Output: ['aws-0', 'gcp-0', 'azure-0']
        # e.g. init_buckets_for_instances(["aws"], 3))  # Output: ['aws-0', 'aws-1', 'aws-2']
        buckets = []
        for cloud_provider in [CloudProvider.AWS, CloudProvider.GCP, CloudProvider.AZURE, CloudProvider.CHAMELEON]:
            instance_num = instances_per_cloud.get(cloud_provider, 0)
            for i in range(instance_num):
                for cloud_type in [BucketType.Input, BucketType.Output]:
                    bucket = Bucket(job_id, cloud_provider,
                                    cloud_type, str(i))
                    buckets.append(bucket)

        return buckets
