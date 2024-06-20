from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa

from bucket import BucketUtils, BucketType
from job import *
from analysis_metadata import *
from flask_cors import CORS, cross_origin
from firebase import create_new_notification, update_analysis_status, get_analysis_id_by_job_id, create_new_result, create_new_data_analyst_notification
from multiprocessing import Process
import time
import os
from collections import *
from typing import *
import utils
import uuid
from flask import Flask, jsonify, request


app = Flask(__name__)
CORS(app)


jobs: Dict[str, Job] = {}


def get_checkpoint_status(job_id):
    if job_id not in jobs:
        return {"error": "Job ID not found", "job_id": job_id}, 404

    job = jobs[job_id]
    checkpoint_file = job.runtime.checkpoint_file

    if not os.path.isfile(checkpoint_file):
        return {
            "error": "Cannot get the status. Please check if the job is submitted.",
            "job_id": job_id,
        }, 409

    with open(checkpoint_file, "r") as f:
        statuses = [line.strip() for line in f if line.strip()]
    current_status = statuses[-1] if statuses else "Unknown"

    pid = job.runtime.process_id
    returncode = utils.get_process_returncode(pid)
    process_failed = returncode is not None or not utils.is_process_running(
        pid)

    if process_failed and current_status.lower() != "success":
        return {
            "status": "Fail",
            "error": f"Failed. Last status is {statuses[-1]}",
            "job_id": job_id,
        }, 200

    # return output bucket urls by "result"
    if current_status.lower() == "success" or current_status.lower() == "terminating compute resources":
        output_buckets = BucketUtils.filter_buckets(
            job.buckets, bucket_type=BucketType.Output)
        return {
            "status": current_status,
            "job_id": job_id,
            "result": BucketUtils.get_presigned_urls(output_buckets, "/result")
        }, 200

    return {"status": current_status, "job_id": job_id}, 200


def update_firebase_status(job_id):
    print("Analysis Id")
    analysis_id = get_analysis_id_by_job_id(job_id)
    print(analysis_id)
    prev_job_status = None
    has_result = False
    while True:
        print("Running update_firebase_process")
        job_status_response, status_code = get_checkpoint_status(job_id)
        print("Job Status Response:")
        print(job_status_response)
        if status_code != 200:
            # Handle non-200 responses
            print(f"Error: {job_status_response.get('error')}")
            return

        job_status = job_status_response.get("status", "Unknown")
        print("Job Status:")
        print(job_status)

        if job_status != "Unknown":
            message = job_status
            if "error" in job_status_response:
                message = job_status_response.get("error", job_status)
            elif "result" in job_status_response:
                message = job_status_response.get("result", job_status)

            print("Message:")
            print(message)
            if analysis_id != None and prev_job_status != job_status:
                create_new_notification(
                    analysis_id=analysis_id, message=message, title=job_status
                )
                update_analysis_status(
                    analysis_id=analysis_id, message=message, status=job_status
                )
                create_new_data_analyst_notification(
                    analysis_id=analysis_id, message=job_status)
        if "result" in job_status_response:
            if not has_result:
                # do not update firebase multiple times
                has_result = True

                result = job_status_response["result"]
                if not result:
                    continue

                create_new_result(analysis_id=analysis_id, result_data=result)
                has_result = True

            # job_status should be "Success" or "Terminating compute resources"
            if job_status == "Success":
                return
        elif job_status == "Fail":
            return
        prev_job_status = job_status
        time.sleep(3)


@app.route("/get-status", methods=["GET"])
def get_status():
    job_id = request.args.get("job_id")
    if job_id not in jobs:
        return jsonify(error="Job ID not found", job_id=job_id), 404

    job = jobs[job_id]
    if not job.runtime:
        # the job hasn't been submitted. no checkpoint yet.
        status, response_code = job.job_status.value, 200
    else:
        status, response_code = get_checkpoint_status(job_id)
    return jsonify(status), response_code


@app.route("/agents/get-presigned-urls", methods=["GET"])
def get_presigned_urls():
    """
    This endpoint is used by agents to obtain presigned URLs that enable them to download or upload 
    data blobs to/from specific cloud storage buckets depending on the specified bucket type.

    Args:
        job_id (str): The unique identifier for the job. Must be present in the current jobs record.
        cloud_provider (str): The cloud provider associated with the job. Must be one of the cloud providers listed in the job's record.
        bucket_type (str): The type of bucket operation, either 'in' for input buckets or 'out' for output buckets.
        seq_num(str): The seq_num of a vm instance. It is used to differentiate different VMs with the same cloud provider.

    Returns:
        JSON response containing a list of presigned URLs or an error message:
        - On success: Returns HTTP 200 with a JSON object containing "urls" which is a list of presigned URLs.
        - On failure: Returns HTTP 404 with a JSON error message if the job_id is not found, the cloud provider is not recognized, 
          or the bucket_type is invalid.

    Example of error response:
        {
            "error": "Job ID not found",
            "job_id": "example_job_id"
        }

    The function interacts with a utility module `utils` to filter bucket names based on the provided job_id, cloud_provider,
    and bucket_type, and to generate the presigned URLs for the specified paths.
    """
    job_id = request.args.get("job_id")

    try:
        cloud_provider = CloudProvider.from_str(
            request.args.get("cloud_provider"))
        bucket_type = BucketType.from_str(request.args.get("bucket_type"))
    except ValueError as e:
        return jsonify(error=f"Parse request args error: {e}"), 400

    seq_num = request.args.get("seq_num")

    if job_id not in jobs:
        return jsonify(error="Job ID not found", job_id=job_id), 404

    job = jobs[job_id]
    buckets = BucketUtils.filter_buckets(
        job.buckets, cloud_provider=cloud_provider, bucket_type=bucket_type, suffix=seq_num)

    # if job_id is wage gap and look for input chameleon, return the Azure one
    if job_id == constants.WAGE_GAP_SEMI_STATIC_JOB_ID and bucket_type == BucketType.Input and cloud_provider == CloudProvider.CHAMELEON:
        buckets = [Bucket(job_id, CloudProvider.AZURE, BucketType.Input, seq_num)]

    if not buckets:
        return jsonify(error=f"{cloud_provider} is not found in job's record.", job_id=job_id), 404

    urls = []

    if bucket_type == BucketType.Input:
        # return read-only urls for input buckets
        for data_owner in job.data_owner_ids:
            blob_path = f"/{data_owner}"
            presigned_urls = BucketUtils.get_presigned_urls(buckets, blob_path)
            urls.extend(presigned_urls)
    else:
        # return write-only urls for output buckets
        blob_path = "/result"
        urls = BucketUtils.get_presigned_urls(
            buckets, blob_path, write_only=True)

    return jsonify(urls=urls), 200


@app.route("/register-data-owner", methods=["POST"])
def register_data_owner():
    data = request.get_json()
    job_id: str = data["job_id"]
    data_owner_id: str = data["data_owner"]

    if job_id not in jobs:
        return jsonify(error="Job ID not found", job_id=job_id), 404

    job = jobs[job_id]  # get the job record of the job_id

    # a data owner can only register to a job that has not been submitted.
    if job.job_status != JobStatus.CREATED:
        return (
            jsonify(
                error="The job has been submitted. Cannot register to a submitted job.",
                job_id=job_id,
            ),
            409,
        )

    job.add_data_owner(data_owner_id)

    # create write-only presigned urls of input buckets no matter the data owner has been registered or not.
    # if registered, presigned urls with new expiration time will be created.
    input_buckets = BucketUtils.filter_buckets(
        job.buckets, bucket_type=BucketType.Input)
    if job_id == constants.WAGE_GAP_SEMI_STATIC_JOB_ID:
        # keep AWS and GCP buckets
        input_buckets = []
        for cloud_provider in [CloudProvider.AWS, CloudProvider.GCP]:
            input_buckets.extend(BucketUtils.filter_buckets(
                job.buckets, cloud_provider=cloud_provider, bucket_type=BucketType.Input))
        # manually add Azure bucket into the return
        input_buckets.append(
            Bucket(job_id, CloudProvider.AZURE, BucketType.Input, "0"))

    # we make the blob name the same as the data owner id.
    blob_path = f"/{data_owner_id}"
    presigned_urls = BucketUtils.get_presigned_urls(
        input_buckets, blob_path, write_only=True)

    # persistent
    utils.save_jobs_to_file(jobs)

    return jsonify(
        presigned_urls=presigned_urls,
        job_id=job_id,
    )


@app.route("/create-job", methods=["POST"])
@cross_origin(origin="*")
def create_job():
    data = request.get_json()
    # check necessary fields
    required_fields = [
        "analysis_name",
        "query_sql",
        "security_level",
        "cloud_providers",
        # "schema",
    ]
    missing_fields = [field for field in required_fields if field not in data]

    # return 400 if missing any fields
    if missing_fields:
        return (
            jsonify(
                {"error": "missing necessary fields",
                    "missing_fields": missing_fields}
            ),
            400,
        )

    analysis_name: str = data.get("analysis_name")
    query_sql: str = data.get("query_sql")
    try:
        security_level = SecurityLevel.from_str(
            data.get("security_level"))  # str -> SecurityLevel
        cloud_providers = parse_cloud_provider_strs(
            data.get("cloud_providers"))  # List[str] -> List[CloudProvider]
    except ValueError as e:
        return jsonify(error=f"Parse analysis metadata error: {e}"), 400
    # schema = data.get("schema")  # dict. {col_name1: unit1, col_name2: unit2}
    analysis_metadata = AnalysisMetadata(
        analysis_name, query_sql, security_level, cloud_providers)

    # create a job
    job_id = str(uuid.uuid4())
    job = Job(job_id, analysis_metadata)

    # create buckets
    try:
        job.create_buckets_on_cloud()
    except Exception as e:
        return jsonify(error=f"Buckets creation error: {e}"), 500

    # udpate cache
    jobs[job_id] = job

    # persistent
    utils.save_jobs_to_file(jobs)

    # spawn job to update job status in firebase

    return jsonify(job_id=job_id)


@app.route("/submit-job", methods=["POST"])
def submit_job():
    job_id = request.json.get("job_id")

    if job_id not in jobs:
        return jsonify(error="Job ID not found", job_id=job_id), 404

    job = jobs[job_id]

    # we can only submit jobs that have not yet been submitted and have status as 'created'.
    if job.job_status != JobStatus.CREATED:
        return jsonify(error="Duplicated submission", job_id=job_id), 409

    # data validation. check if each input buckets have the same secret shares
    input_buckets = BucketUtils.filter_buckets(
        job.buckets, bucket_type=BucketType.Input)

    # for wage gap, change the chameleon input bucket to the azure input bucket
    if job_id == constants.WAGE_GAP_SEMI_STATIC_JOB_ID:
        # keep AWS and GCP buckets
        input_buckets = []
        for cloud_provider in [CloudProvider.AWS, CloudProvider.GCP]:
            input_buckets.extend(BucketUtils.filter_buckets(
                job.buckets, cloud_provider=cloud_provider, bucket_type=BucketType.Input))
        # manually add Azure bucket into the return
        input_buckets.append(
            Bucket(job_id, CloudProvider.AZURE, BucketType.Input, "0"))

    for data_owner_id in job.data_owner_ids:
        # we make the blob path the same as the data owner id when registering data owners
        blob_path = f"/{data_owner_id}"
        if not BucketUtils.blob_exists_in_all_buckets(input_buckets, blob_path):
            return (
                jsonify(
                    error=f"Data validation failed for data owner {data_owner_id}. {blob_path} is missed in one of the storage: {[input_bucket.name for input_bucket in input_buckets]}"
                ),
                500,
            )

    # build up experiment file under ./deployment/experiments
    job.run()

    # persistent
    utils.save_jobs_to_file(jobs)

    print("Starting update_firebase_process")
    update_process = Process(target=update_firebase_status, args=(job_id,))
    update_process.start()
    return jsonify(status="success", job_id=job_id), 200


@app.route("/admin/reset-analysis", methods=["POST"])
def reset_analysis():
    job_id = request.json.get("job_id")
    if job_id not in jobs:
        return jsonify(error="Job ID not found", job_id=job_id), 404

    jobs[job_id].reset()

    # clear the data owner of wage gap too
    if job_id == constants.WAGE_GAP_SEMI_STATIC_JOB_ID:
        job = jobs[job_id]
        job.data_owner_ids.clear()
        # remove all registered data owners from firebase too
        firebase_analysis_id = firebase.get_analysis_id_by_job_id(job_id)
        updates = {"ownersRegistered": []}
        firebase.update_analysis_catalog_ref_by_id(
            firebase_analysis_id, updates)

    utils.save_jobs_to_file(jobs)

    return jsonify(status="success", job_id=job_id), 200


@app.route("/dummy-post", methods=["POST"])
def dummy_post():
    # Check if the request has JSON data
    if request.is_json:
        # Parse the JSON data
        data = request.get_json()

        # You can process the data here
        # For example, just echoing back the received data
        response = {
            "status": "success",
            "message": "Data received",
            "received_data": data,
        }
    else:
        # If no JSON found in request
        response = {"status": "error", "message": "Request must be JSON"}

    return jsonify(response)


@app.route('/test')
def hello_world():
    return jsonify({"jobs": [job_id for job_id, _ in jobs.items()], "data owners": [list(jobs[job_id].data_owner_ids) for job_id, _ in jobs.items()]})


if __name__ == "__main__":
    jobs = utils.load_jobs_from_file()
    utils.init_predefined_jobs(jobs)
    app.run(host='0.0.0.0', debug=True)
