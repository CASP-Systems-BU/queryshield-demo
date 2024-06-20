"""
This script processes blobs from cloud storage based on the specified job ID, cloud provider, and operation type.

Usage:
  python agent.py <job_id> <cloud_provider> <type> <file>

Arguments:
  job_id          - Unique identifier for the job.
  cloud_provider  - Name of the cloud provider, e.g., 'aws', 'azure', 'gcp'.
  type            - Type of operation to perform. Options are 'upload' or 'download'.
  file            - 

Operations:
  upload   - Gathers presigned URLs and uploads a file named 'result.csv' to these URLs.
  download - Retrieves presigned URLs, downloads files from these URLs, and merges them into 'input_shares.csv'.

Examples:
  python agent.py 12345 aws download
  python agent.py 12345 aws upload
"""

import argparse
import requests
import pandas as pd
import os

# static endpoint for queryshield backend
BASE_URL = "http://52.14.141.89:5000"
SEQ_NUM = os.environ.get('SEQ_NUM')


def get_presigned_urls(job_id, cloud_provider, bucket_type):
    """ Fetch presigned URLs from the QueryShield endpoint """
    url = f"{BASE_URL}/agents/get-presigned-urls"

    params = {'job_id': job_id,
              'cloud_provider': cloud_provider, 'bucket_type': bucket_type, 'seq_num': SEQ_NUM}
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()['urls']


def download_and_merge_files(urls, output_file):
    """ Download files using presigned URLs and merge them """
    dfs = []
    for url in urls:
        response = requests.get(url)
        response.raise_for_status()
        tmp_file = "tmp.csv"
        with open(tmp_file, 'wb') as f:
            f.write(response.content)
        dfs.append(pd.read_csv(tmp_file))
        os.remove(tmp_file)  # Optionally remove the file after reading

    # Merge all data frames into a single CSV file
    result_df = pd.concat(dfs, ignore_index=True)
    result_df.to_csv(output_file, index=False)
    print(f"All files merged into {output_file}")


def upload_file(urls, file_path):
    """ Upload a file using a presigned URL """
    headers = {
        'x-ms-blob-type': 'BlockBlob',
        "Content-Type": "text/csv",
    }
    with open(file_path, 'rb') as f:
        for presigned_url in urls:
            if not isinstance(presigned_url, str):
                # the presigned url for uploading data to aws is an object
                files = {'file': (file_path, f)}
                response = requests.post(
                    presigned_url['url'], data=presigned_url['fields'], files=files)
            elif "chameleoncloud" in presigned_url:
                print("chameleoncloud url")
                response = requests.put(presigned_url, data=f)
            else:
                response = requests.put(presigned_url, data=f, headers=headers)
            print(response.text)
    print(f"File uploaded successfully: {file_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Process blobs from cloud storage.")
    parser.add_argument("job_id", help="Job identifier")
    parser.add_argument("type", choices=[
                        'upload', 'download'], help="Operation type: upload or download")
    parser.add_argument("file", help="The file to upload or download")

    parser.add_argument(
        "--cloud", help="Cloud provider name. If not provide, will read from CLOUD env", default=None)
    args = parser.parse_args()

    file_path = args.file

    cloud = args.cloud
    if not cloud:
        cloud = os.environ.get('CLOUD')

    print(f"I'm: {cloud}-{SEQ_NUM}")
    if args.type == 'download':
        urls = get_presigned_urls(
            args.job_id, cloud, 'in')
        print(f"download urls are: {urls}")
        download_and_merge_files(urls, file_path)
    elif args.type == 'upload':
        urls = get_presigned_urls(
            args.job_id, cloud, 'out')
        print(f"upload urls are: {urls}")
        upload_file(urls, file_path)


if __name__ == "__main__":
    main()
