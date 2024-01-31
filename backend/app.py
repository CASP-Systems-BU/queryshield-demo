from flask import Flask, jsonify, request
import uuid
import utils
from typing import *
from collections import *
import subprocess
import os
import time
from multiprocessing import Process
from firebase import create_new_notification, update_analysis_status, get_analysis_id_by_job_id, create_new_result, create_new_data_analyst_notification
from flask_cors import CORS, cross_origin

app = Flask(__name__)
CORS(app)


def recursive_defaultdict():
    return defaultdict(recursive_defaultdict)


jobs = defaultdict(recursive_defaultdict)


def get_checkpoint_status(job_id):
    if job_id not in jobs:
        return {"error": "Job ID not found", "job_id": job_id}, 404

    log_dir = utils.get_log_dir_path(job_id)
    checkpoint_file = f"{log_dir}/checkpoint"

    if not os.path.isfile(checkpoint_file):
        return {
            "error": "Cannot get the status. Please check if the job is submitted.",
            "job_id": job_id,
        }, 409

    with open(checkpoint_file, "r") as f:
        statuses = [line.strip() for line in f if line.strip()]
    current_status = statuses[-1] if statuses else "Unknown"

    pid = jobs[job_id]["process"]
    returncode = utils.get_process_returncode(pid)
    process_failed = returncode is not None or not utils.is_process_running(
        pid)

    if process_failed and current_status.lower() != "success":
        return {
            "status": "Fail",
            "error": f"Failed. Last status is {statuses[-1]}",
            "job_id": job_id,
        }, 200

    if current_status.lower() == "success":
        return {
            "status": current_status,
            "job_id": job_id,
            "result": utils.read_result_content(job_id),
        }, 200

    return {"status": current_status, "job_id": job_id}, 200


def update_firebase_status(job_id):
    print("Analysis Id")
    analysis_id = get_analysis_id_by_job_id(job_id)
    print(analysis_id)
    prev_job_status = None
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
        if job_status == "Success":
            result = job_status_response.get("result", None)
            if result == None:
                return
            create_new_result(analysis_id=analysis_id, result_data=result)
            return
        elif job_status == "Fail":
            return
        prev_job_status = job_status
        time.sleep(3)


@app.route("/get_status", methods=["GET"])
def get_status():
    job_id = request.args.get("job_id")
    status, response_code = get_checkpoint_status(job_id)
    return jsonify(status), response_code


@app.route("/register_data_owner", methods=["POST"])
def register_data_owner():
    data = request.get_json()
    job_id = data["job_id"]
    data_owner = data["data_owner"]

    print(f"job_id: {job_id}")
    print(f"data_owner: {data_owner}")
    # print(f"jobs: {jobs}")

    if job_id not in jobs:
        return jsonify(error="Job ID not found", job_id=job_id), 404
    if jobs[job_id]["status"] != "created":
        return (
            jsonify(
                error="The job has been submitted. Cannot register to a submitted job.",
                job_id=job_id,
            ),
            409,
        )

    # no matter the data owner has been registered or not
    # if registered, presigned urls with new expiration time will be created and substitue the previous ones.
    # create write-only presigned urls
    bucket_names = jobs[job_id]["bucket_names"]
    blob_path = f"/{data_owner}"
    presigned_urls = utils.get_presigned_url(
        bucket_names, blob_path, write_only=True)
    # update cache
    jobs[job_id]["data_owners"][data_owner][
        "write_only_presigned_urls"
    ] = presigned_urls

    # persistent
    utils.save_jobs_to_file(jobs)

    return jsonify(
        presigned_urls=jobs[job_id]["data_owners"][data_owner][
            "write_only_presigned_urls"
        ],
        job_id=job_id,
    )


@app.route("/create_job", methods=["POST"])
@cross_origin(origin="*")
def create_job():
    data = request.get_json()
    # check necessary fields
    required_fields = [
        "analysis_name",
        "query_sql",
        "security_level",
        "cloud_providers",
        "schema",
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

    analysis_name = data.get("analysis_name")  # str
    query_sql = data.get("query_sql")  # str
    security_level = data.get("security_level")  # str
    cloud_providers = data.get("cloud_providers")  # list of str
    schema = data.get("schema")  # dict. {col_name1: unit1, col_name2: unit2}

    # create uuid for the job
    job_id = str(uuid.uuid4())

    # create buckets
    try:
        bucket_names = utils.create_buckets(job_id, cloud_providers)
        jobs[job_id]["bucket_names"] = bucket_names
    except Exception as e:
        return jsonify(error=f"Buckets creation error: {e}"), 500

    # udpate cache
    jobs[job_id]["analysis_name"] = analysis_name
    jobs[job_id]["query_sql"] = query_sql
    jobs[job_id]["security_level"] = security_level
    jobs[job_id]["cloud_providers"] = cloud_providers
    jobs[job_id]["schema"] = schema
    jobs[job_id]["status"] = "created"

    # print(jobs)

    # persistent
    utils.save_jobs_to_file(jobs)

    # spawn job to update job status in firebase

    return jsonify(job_id=job_id)


@app.route("/submit_job", methods=["POST"])
def submit_job():
    job_id = request.json.get("job_id")
    # print(f"job_id: {job_id}")

    if job_id not in jobs:
        return jsonify(error="Job ID not found", job_id=job_id), 404
    if jobs[job_id]["status"] != "created":
        return jsonify(error="Duplicated submission", job_id=job_id), 409

    # data validation. check if each storage have the same secret shares
    bucket_names = jobs[job_id]["bucket_names"]
    for data_owner in jobs[job_id]["data_owners"]:
        blob_path = f"/{data_owner}"
        if not utils.validate_blob(bucket_names, blob_path):
            return (
                jsonify(
                    error=f"Data validation failed for data owner {data_owner}. {blob_path} is missed in one of the storage: {bucket_names}"
                ),
                500,
            )

    # TODO: build up experiment file under ./deployment/experiments

    # trigger deploy_tva.sh to run ansible playbook
    # save log under ./logs/${job_id}
    pwd = os.getcwd()
    log_dir = utils.get_log_dir_path(job_id)
    os.makedirs(log_dir, exist_ok=True)
    log_file = f"{log_dir}/log.txt"
    checkpoint_file = f"{log_dir}/checkpoint"

    # create checkpoint file
    with open(checkpoint_file, "w") as f:
        f.write("Submitted\n")

    with open(log_file, "w") as f:
        process = subprocess.Popen(
            [
                "/bin/bash",
                f"{pwd}/deployment/deploy_tva.sh",
                "tva-experiment",
                job_id,
                log_dir,
            ],
            stdout=f,
            stderr=subprocess.STDOUT,
        )

    jobs[job_id]["process"] = process.pid
    jobs[job_id]["status"] = "submitted"

    # persistent
    utils.save_jobs_to_file(jobs)

    # TODO: uncomment below
    print("Starting update_firebase_process")
    update_process = Process(target=update_firebase_status, args=(job_id,))
    update_process.start()
    return jsonify(status="success", job_id=job_id)


@app.route("/dummy_post", methods=["POST"])
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
    return 'Hello World!'


if __name__ == "__main__":
    jobs = utils.load_jobs_from_file()
    # todo-es : find a way to store information in database so if error occurs, we can have everything persist
    app.run(debug=True)
