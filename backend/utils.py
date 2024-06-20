from typing import *
import os
import psutil
import pickle5 as pickle
from job import Job
from analysis_metadata import *
import constants


def save_jobs_to_file(jobs: Dict[str, Job], filename='./jobs.pickle'):
    with open(filename, 'wb') as f:
        pickle.dump(jobs, f)


def load_jobs_from_file(filename='./jobs.pickle') -> Dict[str, Job]:
    try:
        with open(filename, 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        return {}


def is_process_running(pid):
    try:
        p = psutil.Process(pid)
        if p.status() == psutil.STATUS_ZOMBIE:
            return False
        return p.is_running()
    except:
        return False


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


def init_predefined_jobs(jobs: Dict[str, Job]) -> None:
    # init "credit score" and "glucose monitoring" analysis at here
    # each analysis should have two records: mal and semi-honest

    predefined_job_ids = [
        constants.CREDIT_SCORE_SEMI_STATIC_JOB_ID,
        constants.MEDICAL_SEMI_STATIC_JOB_ID,
        constants.WAGE_GAP_SEMI_STATIC_JOB_ID,
        constants.CREDIT_SCORE_MAL_STATIC_JOB_ID
    ]
    for job_id in predefined_job_ids:
        if job_id in jobs:
            continue
        job = Job.from_firebase(job_id)
        if job:
            jobs[job_id] = job
            job.reset()

    # persist jobs that contain predefined jobs
    save_jobs_to_file(jobs)
