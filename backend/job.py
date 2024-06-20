from collections import defaultdict
import os
import shutil
import subprocess
from typing import DefaultDict, Set
from analysis_metadata import *
from enum import Enum
from bucket import Bucket, BucketUtils
import firebase
import constants
import vm_utils


class JobStatus(Enum):
    CREATED = "created"
    STARTED = "started"


class JobRuntimeUtil:
    @staticmethod
    def get_log_dir_path(job_id) -> str:
        """
        Given a job_id, return the directory path that the job log should be in
        """
        pwd = os.getcwd()
        log_dir = os.path.join(pwd, "logs", job_id)
        return log_dir


class JobRuntime:
    def __init__(self, job_id: str, instances_per_cloud: DefaultDict[CloudProvider, int]) -> None:
        self.job_id = job_id
        self.instances_per_cloud = instances_per_cloud

        # save log and checkpoint under ./logs/${job_id}
        self.log_dir: str = JobRuntimeUtil.get_log_dir_path(job_id)
        self.log_file: str = f"{self.log_dir}/log.txt"
        self.checkpoint_file: str = f"{self.log_dir}/checkpoint"

        self.process_id: Optional[int] = None

    def run(self) -> None:
        # create necessary directories and files
        os.makedirs(self.log_dir, exist_ok=True)

        # create checkpoint file
        with open(self.checkpoint_file, "w") as f:
            f.write("Started\n")

        # trigger deploy.sh to run ansible playbook
        experiment = "credit_score_semi"
        if self.job_id == constants.CREDIT_SCORE_SEMI_STATIC_JOB_ID:
            experiment = "credit_score_semi"
        elif self.job_id == constants.MEDICAL_SEMI_STATIC_JOB_ID:
            experiment = "medical_semi"
        elif self.job_id == constants.WAGE_GAP_SEMI_STATIC_JOB_ID:
            experiment = "wage_gap_semi"
        elif self.job_id == constants.CREDIT_SCORE_MAL_STATIC_JOB_ID:
            experiment = "credit_score_mal"

        pwd = os.getcwd()
        with open(self.log_file, "w") as f:
            process = subprocess.Popen(
                [
                    "/bin/bash",
                    f"{pwd}/deployment/deploy.sh",
                    experiment,
                    self.job_id,
                    self.log_dir,
                    str(self.instances_per_cloud.get(CloudProvider.AWS, 0)),
                    str(self.instances_per_cloud.get(CloudProvider.GCP, 0)),
                    str(self.instances_per_cloud.get(CloudProvider.AZURE, 0)),
                    str(self.instances_per_cloud.get(
                        CloudProvider.CHAMELEON, 0)),
                ],
                stdout=f,
                stderr=subprocess.STDOUT,
            )

        self.process_id = process.pid

    def reset(self) -> None:
        # delete the log directory and files
        try:
            shutil.rmtree(self.log_dir)
        except:
            pass


class Job:
    def __init__(self, job_id: str, analysis_metadata: AnalysisMetadata) -> None:
        self.job_id: str = job_id   # unique id for a job
        self.analysis_metadata: AnalysisMetadata = analysis_metadata
        self.job_status: JobStatus = JobStatus.CREATED

        # stores the unique ids of data owners
        self.data_owner_ids: Set[str] = set()
        # stores the process id when the job starts
        self.runtime: Optional[JobRuntime] = None

        # for each vm instance not cloud provider, create an input bucket and an output bucket.
        self.instances_per_cloud: DefaultDict[CloudProvider, int] = defaultdict(
            int)
        num_instances = 3 if analysis_metadata.security_level == SecurityLevel.SEMI else 4
        for i in range(num_instances):
            cloud_provider = analysis_metadata.cloud_providers[i % len(
                analysis_metadata.cloud_providers)]
            self.instances_per_cloud[cloud_provider] += 1

        self.buckets: List[Bucket] = BucketUtils.init_buckets_for_instances(
            job_id, self.instances_per_cloud)

    def create_buckets_on_cloud(self) -> None:
        """
        Create an input bucket and an output bucket for each cloud provider.
        """
        for bucket in self.buckets:
            # The Bucket constructor does not actually provision resources in the cloud.
            # You must explicitly invoke the create_on_cloud() method to initiate resource creation.
            bucket.create_on_cloud()

    def add_data_owner(self, data_owner: str) -> None:
        self.data_owner_ids.add(data_owner)

    def run(self) -> None:
        self.runtime = JobRuntime(self.job_id, self.instances_per_cloud)
        self.runtime.run()
        self.job_status = JobStatus.STARTED

    def reset(self) -> None:
        # change internal state
        self.job_status = JobStatus.CREATED
        if self.runtime:
            self.runtime.reset()
            self.runtime = None

        # tear down the VMs before chaning the firebase states. 
        # otherwise, the "Start Analysis" button will be enabled when machines are still terminating.
        vm_utils.delete_all(self.job_id)

        # change firebase state
        analysis_id = firebase.get_analysis_id_by_job_id(self.job_id)
        firebase.update_analysis_status(
            analysis_id=analysis_id, status="Created", message="")
        firebase.delete_data_analyst_notification_by_id(analysis_id)
        firebase.delete_results_by_id(analysis_id)
        firebase.delete_data_owner_notifications_by_id(analysis_id)

    @classmethod
    def from_firebase(cls, job_id: str) -> Optional['Job']:
        analysis_id = firebase.get_analysis_id_by_job_id(job_id)
        if not analysis_id:
            return None

        analysis_dict = firebase.get_analysis_dict_by_id(analysis_id)
        if not analysis_dict:
            return None

        security_level = SecurityLevel.SEMI if analysis_dict[
            "serverHonestyLevel"] == "Semi-honest" else SecurityLevel.MAL
        m = {"AWS": CloudProvider.AWS, "Google Cloud": CloudProvider.GCP,
             "Azure": CloudProvider.AZURE, "Chameleon": CloudProvider.CHAMELEON}
        cloud_providers = [m[cloud_name] for cloud_name,
                           exist in analysis_dict["cloudProviders"].items() if exist]
        analysis_metadata = AnalysisMetadata(
            analysis_name=analysis_dict["analysisName"],
            query_sql=analysis_dict["inputQuery"],
            security_level=security_level,
            cloud_providers=cloud_providers
        )

        job = cls(job_id, analysis_metadata)

        for owner_id in analysis_dict["ownersRegistered"]:
            job.add_data_owner(owner_id)

        return job
