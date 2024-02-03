# QueryShield Backend

## Introduction

The QueryShield Backend is designed to create and manage cloud resources necessary for running and tracking jobs in analysis environments. Deployed on the Secrecy/TVA deploy machine, this service can handle various tasks essential for job management. Key functionalities include:

1. Creating cloud storage (e.g., buckets) across different cloud providers.
2. Provisioning various Virtual Machines (VMs).
3. Deploying Secrecy/TVA code on different servers.
4. Editing and triggering run scripts based on job configurations.
5. Tracking job progress.

## API Endpoints

### 1. Create Job

-   **Endpoint**: `/create_job`
-   **Method**: `POST`
-   **Required Parameters**:
    -   `analysis_name`: str
    -   `query_sql`: str
    -   `security_level`: str. This field should be one of the following: `"semi"`, `"mal"`.
    -   `cloud_providers`: list of str. Each cloud provider should be one of the following: `"aws"`, `"gcp"`, `"azure"`.
    -   `schema`: dictionary. {col_name1: unit1, col_name2: unit2}
-   **Response**: JSON object with a unique `job_id` for the created job.
    -   **Example Response:**
        ```json
        {"job_id": "a567fa09-a81b-46a8-b5af-717bf71e0a84"}
        {"error": "missing necessary fields", "missing_fields": ["cloud_providers"]}
        {"error": "Buckets creation error: xxx"}
        ```
-   **Error Code:**
    -   `200 OK`: OK
    -   `400 Bad Request`: Missing or invalid parameters.
    -   `500 Internal Server Error`: Bucket creation failed.
-   **Description**: Creates a new job with the specified configuration. This endpoint initializes storage resources and modifies the deployment plan as per the provided details. The response includes a unique `job_id` which can be used to submit the job and track the job status.
-   **Sample Request**
    ```bash
    curl -X POST "https://localhost:5000/create_job" \
    -H "Content-Type: application/json" \
    -d '{
          "analysis_name": "Traffic Analysis",
          "query_sql": "SELECT * FROM traffic_data",
          "security_level": "semi",
          "cloud_providers": ["aws", "gcp"],
          "schema": {"speed": "mph", "vehicle_count": "count"},
        }'
    ```
-   **Example Code**

    ```python
    import requests

    def create_job(config):
        response = requests.post("https://localhost:5000/create_job", json=config)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": response.status_code, "message": response.text}

    # Example usage
    job_config = {
        "analysis_name": "Traffic Analysis",
        "query_sql": "SELECT * FROM traffic_data",
        "security_level": "semi",
        "cloud_providers": ["aws", "gcp"],
        "schema": {"speed": "mph", "vehicle_count": "count"},
    }
    job_id = create_job(job_config)
    print(job_id)
    ```

### 2. Register a data owner to a job

-   **Endpoint**: `/register_data_owner`
-   **Method**: `POST`
-   **Required Parameters:**
    -   `job_id`: str. Created by `/create_job`.
    -   `data_owner`: str. The unique identifier of the data owner, such as _user_id_ or _user_name_.
-   **Response**: A JSON object containing write-only presigned URLs for the data owner to upload data for the specified job.
    -   **Example Response:**
        ```json
        {
        	"presigned_urls": [
        		"https://aws-storage.com/upload?X-Amz-Signature=abc123",
        		"https://gcp-storage.com/upload?X-Amz-Signature=def456",
        		"https://azure-storage.com/upload?X-Amz-Signature=def456"
        	],
        	"job_id": "a567fa09-a81b-46a8-b5af-717bf71e0a84"
        }
        ```
-   **Error Code:**
    -   `200 OK`: OK
    -   `404 Not Found`: The job with the specified `job_id` does not exist.
    -   `409 Conflict`: The job has been submitted. Cannot register to a submitted job.
-   **Description**: This endpoint is used to register a data owner to a job and return them with write-only presigned URLs for data upload. A data owner can call this API multiple times to get new presigned URLs with new expiration times.
-   **Sample Request:**
    ```bash
    curl -X POST "https://localhost:5000/register_data_owner" \
    -H "Content-Type: application/json" \
    -d '{
          "job_id": "12345",
          "data_owner": "user123"
        }'
    ```
-   **Example Code:**

    ```python
    import requests

    def register_data_owner(job_id, data_owner):
        payload = {"job_id": job_id, "data_owner": data_owner}
        response = requests.post("https://localhost:5000/register_data_owner", json=payload)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": response.status_code, "message": response.text}

    # Example usage
    urls = register_data_owner("12345", "user123")
    print(urls)
    ```

### 3. Submit Job

-   **Endpoint**: `/submit_job`
-   **Method**: `POST`
-   **Required Parameters**:
    -   `job_id`: str. Created by `/create_job`.
-   **Response**: JSON object indicating success or error.
    -   **Example Success Response:**
        ```json
        {
        	"status": "success",
        	"job_id": "a567fa09-a81b-46a8-b5af-717bf71e0a84"
        }
        ```
    -   **Example Error Response:**
        ```json
        {"error": "Job ID not found", "job_id": "${UNKNOWN_ID}"}
        {"error": "Duplicated submission", "job_id": "a567fa09-a81b-46a8-b5af-717bf71e0a84"}
        {"error": "Data validation failed", "job_id": "a567fa09-a81b-46a8-b5af-717bf71e0a84"}
        ```
-   **Error Code:**
    -   `200 OK`: OK
    -   `404 Not Found`: The job with the specified `job_id` does not exist.
    -   `409 Conflict`: The job has already been submitted.
    -   `500 Internal Server Error`: Data validation failed.
-   **Description**: Submits the job associated with the provided `job_id` for execution. This endpoint triggers the deployment plan script for the specified job. The response indicates whether the submission was successful or if there were any errors (e.g., job not found, duplicated submission).
-   **Sample Request:**
    ```bash
      curl -X POST "https://localhost:5000/submit_job" \
      -H "Content-Type: application/json" \
      -d '{"job_id": "a567fa09-a81b-46a8-b5af-717bf71e0a84"}'
    ```
-   **Example Code:**

    ```python
    import requests

    def submit_job(job_id):
        response = requests.post("https://localhost:5000/submit_job", json={"job_id": job_id})
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": response.status_code, "message": response.text}

    # Example usage
    response = submit_job("a567fa09-a81b-46a8-b5af-717bf71e0a84")
    print(response)
    ```

### 4. Get Status

-   **Endpoint**: `/get_status`
-   **Method**: `GET`
-   **Required Parameters**:
    -   `job_id`: str (Unique identifier for the job)
-   **Response**: JSON object containing the status of the specified job.
    -   **Example Response:**
        ```json
        {"status": "Running Experiment", "job_id": "a567fa09-a81b-46a8-b5af-717bf71e0a84"}
        {"status": "Fail", "error": "Failed. Last status is Running Experiment.", "job_id": "a567fa09-a81b-46a8-b5af-717bf71e0a84"}
        ```
-   Possible statuses:
    -   `Submitted`
    -   `Creating VMs`
    -   `VMs Created`
    -   `Setting Up Authentication`
    -   `Finished Authentication Setup`
    -   `Deploying TVA Core`
    -   `Finished TVA Core Deployment`
    -   `Running Experiment`
    -   `Success`
    -   `Fail`
-   **Error Code:**
    -   `200 OK`: OK
    -   `404 Not Found`: No job found with the provided `job_id`.
    -   `409 Conflict`: No job status of `job_id`, perhaps the job is not submitted yet.
-   **Description**: Retrieve the status of a job using its unique `job_id`.
-   **Sample Request:**
    ```bash
    curl -X GET "https://localhost:5000/get_status?job_id=12345"
    ```
-   **Example Code:**

    ```python
    import requests

    def get_job_status(job_id):
        params = {'job_id': job_id}
        response = requests.get(f"https://localhost:5000/get_status", params=params)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": response.status_code, "message": response.text}

    # Example usage
    status = get_job_status("12345")
    print(status)
    ```

## Installation & Startup

```bash
sudo apt install python3-flask
sudo apt install python3-pip
sudo apt install ansible
sudo pip3 install --upgrade pip
pip install -r requirements.txt
# Install Ansible az collection for interacting with Azure.
ansible-galaxy collection install azure.azcollection --force
# Install Ansible modules for Azure
sudo pip3 install -r ~/.ansible/collections/ansible_collections/azure/azcollection/requirements-azure.txt
```

The QueryShield Backend is built on Python Flask. Standard installation and startup procedures for a Flask application apply.
