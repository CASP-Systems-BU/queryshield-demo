#!/bin/bash

# Check the number of arguments
if [ $# -lt 2 ] || [ $# -gt 7 ]; then
  echo "Usage: $0 exp_name job_id log_dir aws_instance_num gcp_instance_num azure_instance_num chameleon_instance_num"
  exit 1
fi

# Assign the provided arguments to variables or use default values
exp_name=${1} # Described by yaml file.
job_id=${2}   # Used as a prefix for the spawn machines.
log_dir=${3}
aws_instance_num=${4}
gcp_instance_num=${5}
azure_instance_num=${6}
chameleon_instance_num=${7}

cd deployment

input_json=$(
  cat <<EOF
{
  "exp_name": "../experiments/${exp_name}.yaml",
  "log_dir": "${log_dir}",
  "job_id": "${job_id}",
  "aws_instance_num": ${aws_instance_num},
  "gcp_instance_num": ${gcp_instance_num},
  "azure_instance_num": ${azure_instance_num},
  "chameleon_instance_num": ${chameleon_instance_num}
}
EOF
)
cat ~/.ssh/id_rsa.pub >./common/authorized_keys_temp

echo ${exp_name} ${run_name} ${log_dir} ${input_json} ${aws_instance_num} ${gcp_instance_num} ${azure_instance_num} ${chameleon_instance_num}
ansible-playbook ./common/main.yaml -e "${input_json}"

# Capture the exit status of ansible-playbook
ansible_exit_status=$?

echo "finished with code $ansible_exit_status"

# Exit the script with the captured exit status
exit $ansible_exit_status
