export const HONESTY_LEVEL = {
	MALICIOUS: "Malicious",
	SEMIHONEST: "Semi-honest",
};

export const HONESTY_LEVEL_API = {
	[HONESTY_LEVEL.MALICIOUS]: "mal",
	[HONESTY_LEVEL.SEMIHONEST]: "semi",
};

export const CLOUD_PROVIDERS = {
	AWS: "AWS",
	GOOGLE_CLOUD: "Google Cloud",
	AZURE: "Azure",
	CHAMELEON: "Chameleon",
};

export const CLOUD_PROVIDERS_API = {
	[CLOUD_PROVIDERS.AWS]: "aws",
	[CLOUD_PROVIDERS.GOOGLE_CLOUD]: "gcp",
	[CLOUD_PROVIDERS.AZURE]: "azure",
	[CLOUD_PROVIDERS.CHAMELEON]: "chameleon",
};

export const ACCESS_PERMISSION_ROLES = {
	DATA_OWNER: "DATA_OWNER",
	DATA_ANALYST: "DATA_ANALYST",
	ADMIN: "ADMIN",
};
export const ANALYSIS_STATUS = {
	CREATED: "Created",
	SUBMITTED: "Started",
	CREATING_VMS: "Creating VMs",
	VMS_CREATED: "VMs Created",
	SETTING_UP_AUTH: "Setting Up Authentication",
	FINISHED_AUTH_SETUP: "Finished Authentication Setup",
	DEPLOYING_AGENT: "Deploying Agent",
	FINISHED_AGENT_DEPLOYMENT: "Finished Agent Deployment",
	PREPARING_INPUT_SECRET_SHARES: "Preparing Input Secret Shares",
	INPUT_SECRET_SHARES_PREPARED: "Input Secret Shares Prepared",
	RUNNING_EXPERIMENT: "Running Experiment",
	EXPERIMENT_FINISHED: "Experiment Finished",
	EXPORTING_RESULT_SHARES: "Exporting Result Secret Shares",
	RESULT_SHARES_EXPORTED: "Result Secret Shares Exported",
	TERMINATING_RESOURCES: "Terminating compute resources",
	SUCCESS: "Success",
	FAIL: "Fail",
	COMPLETE: "Completed"
};

export const SERVER_API_URL = import.meta.env.VITE_SERVER_API_URL

export const API_ENDPOINTS = {
	CREATE_JOB: `${SERVER_API_URL}/create-job`,
	REGISTER_DATA_OWNER: `${SERVER_API_URL}/register-data-owner`,
	SUBMIT_JOB: `${SERVER_API_URL}/submit-job`,
	GET_STATUS: `${SERVER_API_URL}/get-status`,
	DUMMY_POST: `${SERVER_API_URL}/dummy-post`,
	RESET_JOB: `${SERVER_API_URL}/admin/reset-analysis`,
};


export const SCHEMA_DATA_TYPES = {
	INTEGER: "INTEGER",
	STRING: "STRING",
	VARCHAR: "VARCHAR",
	CATEGORY: "CATEGORY",
};

export const PREDEFINED_JOB_IDS = {
	CREDIT_SCORE_SEMI_STATIC_JOB_ID: "credit-score-semi-static-id",
	MEDICAL_SEMI_STATIC_JOB_ID: "medical-semi-static-id",
	WAGE_GAP_SEMI_STATIC_JOB_ID: "wage-gap-semi-static-id",
	CREDIT_SCORE_MAL_STATIC_JOB_ID: "credit-score-mal-static-id",
}