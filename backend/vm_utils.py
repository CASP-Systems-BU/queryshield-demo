import os
import sys
import time
from typing import List
import boto3
from google.cloud import compute_v1
import constants
from azure.mgmt.compute import ComputeManagementClient
from azure.identity import ClientSecretCredential
import concurrent.futures
from multiprocessing import Pool
import openstack

from dotenv import load_dotenv  # noqa
load_dotenv()  # noqa


class AwsVmUtils:
    # Initialize a session using your AWS credentials
    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
    AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
    AWS_REGION = "us-east-2"
    ec2_client = boto3.client(
        "ec2",
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION,
        # endpoint_url=f'https://s3.{AWS_REGION}.amazonaws.com'
    )

    @staticmethod
    def terminate_instances_by_names(instance_name: str):
        ids = AwsVmUtils._get_instance_ids_by_name(instance_name)
        if ids:
            AwsVmUtils._terminate_instances(ids)

    @staticmethod
    def _get_instance_ids_by_name(instance_name):
        """
        Retrieves instance IDs based on the instance name tag.

        :param instance_name: The name of the EC2 instance
        :type instance_name: str
        :return: List of instance IDs matching the given name
        :rtype: list
        """
        try:
            response = AwsVmUtils.ec2_client.describe_instances(
                Filters=[
                    {
                        'Name': 'tag:Name',
                        'Values': [instance_name]
                    }
                ]
            )
            instance_ids = []
            for reservation in response['Reservations']:
                for instance in reservation['Instances']:
                    instance_ids.append(instance['InstanceId'])
            return instance_ids
        except Exception as e:
            print(f"Error fetching instances by name {instance_name}: {e}")
            return []

    @staticmethod
    def _terminate_instances(instance_ids):
        """
        Terminates the specified EC2 instances.

        :param instance_ids: List of EC2 instance IDs to terminate
        :type instance_ids: list
        """
        try:
            response = AwsVmUtils.ec2_client.terminate_instances(
                InstanceIds=instance_ids)
            print("Termination response:", response)

            # Create a waiter
            waiter = AwsVmUtils.ec2_client.get_waiter('instance_terminated')
            print("Waiting for instances to terminate...")

            # Wait for the instances to reach the terminated state
            waiter.wait(InstanceIds=instance_ids)
            print("Instances have been terminated.")

        except Exception as e:
            print("Error terminating instances:", e)


class GcpVmUtils:
    os.environ["CRYPTOGRAPHY_OPENSSL_NO_LEGACY"] = "1"
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv(
        "GOOGLE_APPLICATION_CREDENTIALS_FILE_PATH")
    project_id = "secrecy-326917"
    zone = "us-east1-b"

    @staticmethod
    def delete_instance(instance_name):
        """
        Deletes the specified Compute Engine instance.

        :param instance_name: The name of the instance to delete
        :type instance_name: str
        """
        try:
            instances_client = compute_v1.InstancesClient()
            operation = instances_client.delete(
                project=GcpVmUtils.project_id, zone=GcpVmUtils.zone, instance=instance_name)

            # Wait for the operation to complete
            GcpVmUtils._wait_for_operation(
                GcpVmUtils.project_id, GcpVmUtils.zone, operation.name)
            print(f"Instance {instance_name} deleted successfully.")
        except Exception as e:
            print(f"Error deleting instance {instance_name}: {e}")

    @staticmethod
    def _wait_for_operation(project_id, zone, operation_name):
        """
        Waits for the specified operation to complete.

        :param project_id: GCP project ID
        :type project_id: str
        :param zone: The zone of the operation
        :type zone: str
        :param operation_name: The name of the operation
        :type operation_name: str
        """
        operations_client = compute_v1.ZoneOperationsClient()

        while True:
            result = operations_client.get(
                project=project_id, zone=zone, operation=operation_name)
            if result.status == compute_v1.Operation.Status.DONE:
                if result.error:
                    raise Exception(result.error)
                return result


class AzureVmUtils:
    # Define your Azure credentials and subscription
    resource_group_name = "mpc-demo"

    # Fetch credentials from environment variables
    client_id = os.getenv("AZURE_CLIENT_ID")
    client_secret = os.getenv("AZURE_SECRET")
    tenant_id = os.getenv("AZURE_TENANT")
    subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")

    # Initialize the credentials
    credential = ClientSecretCredential(
        client_id=client_id,
        client_secret=client_secret,
        tenant_id=tenant_id
    )

    # Initialize the Compute Management Client
    compute_client = ComputeManagementClient(credential, subscription_id)

    @staticmethod
    def delete_vm_and_disks(vm_name):
        """
        Deletes the specified Azure VM.

        :param vm_name: The name of the VM to delete
        :type vm_name: str
        """
        try:
            # Get the VM details to find associated disks
            vm = AzureVmUtils.compute_client.virtual_machines.get(
                AzureVmUtils.resource_group_name, vm_name)

            # Get the list of disk IDs
            disk_ids = []
            if vm.storage_profile.os_disk:
                disk_ids.append(vm.storage_profile.os_disk.managed_disk.id)
            if vm.storage_profile.data_disks:
                for disk in vm.storage_profile.data_disks:
                    if disk.managed_disk:
                        disk_ids.append(disk.managed_disk.id)

            # Delete the VM
            async_vm_delete = AzureVmUtils.compute_client.virtual_machines.begin_delete(
                AzureVmUtils.resource_group_name, vm_name)
            async_vm_delete.result()  # Wait for the operation to complete
            print(f"VM {vm_name} deleted successfully.")

            # Delete the associated disks
            for disk_id in disk_ids:
                disk_name = disk_id.split('/')[-1]
                async_disk_delete = AzureVmUtils.compute_client.disks.begin_delete(
                    AzureVmUtils.resource_group_name, disk_name)
                async_disk_delete.result()  # Wait for the operation to complete
                print(f"Disk {disk_name} deleted successfully.")

        except Exception as e:
            print(f"Error deleting VM {vm_name} and its disks: {e}")


class ChameleonUtils:
    # Initialize and authorize the connection
    # Export the env vars that start with "OS_" in the openrc.sh first
    conn = openstack.connect()

    @staticmethod
    def delete_instance_by_name(instance_name):
        instance = ChameleonUtils.conn.compute.find_server(instance_name)
        if instance:
            ChameleonUtils.conn.compute.delete_server(instance, force=True)
            print(
                f"Deletion initiated for instance '{instance_name}'. Waiting for termination...")

            # Polling the instance status until it is no longer found
            while True:
                instance = ChameleonUtils.conn.compute.find_server(
                    instance_name)
                if instance is None:
                    print(
                        f"Instance '{instance_name}' has been terminated successfully.")
                    break
                else:
                    time.sleep(5)  # Wait for 5 seconds before checking again
        else:
            print(f"Instance '{instance_name}' not found.")


def delete_aws_instances(job_id, num_instances):
    for i in range(num_instances):
        aws_instance_name = f"mpc-demo-{job_id}-aws-{i+1}"
        print(f"Deleting {aws_instance_name} on AWS...")
        AwsVmUtils.terminate_instances_by_names(aws_instance_name)
        print(f"Done deleting {aws_instance_name} on AWS!")


def delete_gcp_instances(job_id, num_instances):
    for i in range(num_instances):
        gcp_instance_name = f"mpc-demo-{job_id}-gcp-{i+1}"
        print(f"Deleting {gcp_instance_name} on GCP...")
        GcpVmUtils.delete_instance(gcp_instance_name)
        print(f"Done deleting {gcp_instance_name} on GCP!")


def delete_azure_instances(job_id, num_instances):
    for i in range(num_instances):
        azure_instance_name = f"mpc-demo-{job_id}-azure-{i+1}"
        print(f"Deleting {azure_instance_name} on Azure...")
        AzureVmUtils.delete_vm_and_disks(azure_instance_name)
        print(f"Done deleting {azure_instance_name} on Azure!")


def delete_chameleon_instances(job_id, num_instances):
    for i in range(num_instances):
        chameleon_instance_name = f"mpc-demo-{job_id}-chameleon-{i+1}"
        print(f"Deleting {chameleon_instance_name} on Chameleon...")
        ChameleonUtils.delete_instance_by_name(chameleon_instance_name)
        print(f"Done deleting {chameleon_instance_name} on Chameleon!")


def delete_all(job_id):
    try:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = []
            futures.append(executor.submit(delete_aws_instances, job_id, 1))
            futures.append(executor.submit(delete_gcp_instances, job_id, 1))
            futures.append(executor.submit(delete_azure_instances, job_id, 1))
            futures.append(executor.submit(
                delete_chameleon_instances, job_id, 1))

            # Wait for all futures to complete
            for future in concurrent.futures.as_completed(futures):
                future.result()
    except Exception as e:
        print(f"Error occurred: {e}")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] != 'd':
        exit(0)

    jobs = [
        # constants.CREDIT_SCORE_SEMI_STATIC_JOB_ID,
        # constants.MEDICAL_SEMI_STATIC_JOB_ID,
        constants.WAGE_GAP_SEMI_STATIC_JOB_ID,
        # constants.CREDIT_SCORE_MAL_STATIC_JOB_ID,
    ]

    with Pool() as pool:
        pool.map(delete_all, jobs)

    print("All instances deleted.")
