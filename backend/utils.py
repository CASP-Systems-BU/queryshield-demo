import buckets.aws_bucket as aws_bucket
import buckets.gcp_bucket as gcp_bucket
import buckets.azure_bucket as azure_bucket
from typing import *
import os
import json
from collections import defaultdict
import psutil


def create_buckets(job_id, cloud_providers: List[str]) -> List[str]:
    """
    return the name of buckets in the same order as cloud_providers parameter
    """
    bucket_names = []
    for cloud_provider in cloud_providers:
        # bucket name CANNOT contain underscore '_'
        bucket_name = f"{cloud_provider.lower()}-mpc-demo-{job_id}"
        if cloud_provider.lower() == "aws":
            aws_bucket.create_bucket(bucket_name)
        elif cloud_provider.lower() == "gcp":
            gcp_bucket.create_bucket(bucket_name)
        elif cloud_provider.lower() == "azure":
            azure_bucket.create_bucket(bucket_name)
        elif cloud_provider.lower() == "chameleon":
            # TODO:
            pass
        else:
            raise ValueError(
                f"Invalid cloud provider: {cloud_provider}. Valid cloud providers are: aws, gcp, azure, chameleon")

        bucket_names.append(bucket_name)

    return bucket_names


def get_presigned_url(bucket_names: List[str], blob_path: str, write_only=False) -> List[str]:
    """
    Return the presigned urls for each bucket in the same order as bucket_names input.
    This function will generate read_only presigned urls by default.
    If want to generate write_only urls, please set write_only=True.   
    """
    presigned_urls = []

    for bucket_name in bucket_names:
        presigned_url = None
        if bucket_name.startswith("aws"):
            presigned_url = aws_bucket.generate_presigned_url(
                bucket_name, blob_path, write_only)
        elif bucket_name.startswith("gcp"):
            presigned_url = gcp_bucket.generate_presigned_url(
                bucket_name, blob_path, write_only)
        elif bucket_name.startswith("azure"):
            presigned_url = azure_bucket.generate_presigned_url(
                bucket_name, blob_path, write_only)
        elif bucket_name.startswith("chameleon"):
            # TODO:
            pass
        else:
            raise ValueError(
                f"Invalid bucket name: {bucket_name}. Valid prefix of bucket are: aws, gcp, azure, chameleon")

        presigned_urls.append(presigned_url)

    return presigned_urls


def validate_blob(bucket_names: List[str], blob_path: str) -> bool:
    """
    Return True if blobs with the same name exist in each storage
    """
    for bucket_name in bucket_names:
        if bucket_name.startswith("aws"):
            if not aws_bucket.check_blob_exist(bucket_name, blob_path):
                return False
        elif bucket_name.startswith("gcp"):
            if not gcp_bucket.check_blob_exist(bucket_name, blob_path):
                return False
        elif bucket_name.startswith("azure"):
            if not azure_bucket.check_blob_exist(bucket_name, blob_path):
                return False
        elif bucket_name.startswith("chameleon"):
            # TODO:
            pass
        else:
            raise ValueError(
                f"Invalid bucket name: {bucket_name}. Valid prefix of bucket are: aws, gcp, azure, chameleon")
        
    return True


def get_log_dir_path(job_id) -> str:
    """
    Given a job_id, return the directory path that the job log should be in
    """
    pwd = os.getcwd()
    log_dir = os.path.join(pwd, "logs", job_id)
    return log_dir


def save_jobs_to_file(jobs: defaultdict, filename='./jobs.json'):
    def convert_to_plain_dict(d):
        if isinstance(d, defaultdict):
            d = {k: convert_to_plain_dict(v) for k, v in d.items()}
        return d
    
    with open(filename, 'w') as f:
        json.dump(convert_to_plain_dict(jobs), f, indent=4)


def load_jobs_from_file(filename='./jobs.json'):
    def recursive_defaultdict():
        return defaultdict(recursive_defaultdict)
    try:
        with open(filename, 'r') as f:
            return json.load(f, object_hook=lambda d: defaultdict(recursive_defaultdict, d))
    except FileNotFoundError:
        return defaultdict(recursive_defaultdict)
    
def is_process_running(pid):
    return psutil.pid_exists(pid)

def get_process_returncode(pid):
    try:
        process = psutil.Process(pid)
        returncode = process.wait(timeout=0.1)
        return returncode
    except (psutil.NoSuchProcess, psutil.TimeoutExpired):
        return None

def read_result_content(job_id):
    def find_innermost_file(dir_path):
        if not os.path.isdir(dir_path):
            raise ValueError(f"{dir_path} is not a directory")

        for entry in os.listdir(dir_path):
            entry_path = os.path.join(dir_path, entry)
            if os.path.isdir(entry_path):
                return find_innermost_file(entry_path)
            elif entry_path.endswith('.txt'):
                return entry_path

        return None

    def read_file(file_path):
        with open(file_path, 'r') as file:
            return file.read()
    
    result_folder = f"./deployment/results/{job_id}"
    result_file = find_innermost_file(result_folder)
    if result_file:
        return read_file(result_file)
    
    return None
