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
};

export const ACCESS_PERMISSION_ROLES = {
	DATA_OWNER: "DATA_OWNER",
	DATA_ANALYST: "DATA_ANALYST",
};
export const ANALYSIS_STATUS = {
	CREATED: "Created",
    SUBMITTED:"Submitted",
    CREATING_VMS:"Creating VMs",
    VMS_CREATED:"VMs Created",
    SETTING_UP_AUTH:"Setting Up Authentication",
    FINISHED_AUTH_SETUP:"Finished Authentication Setup",
    DEPLOYING_TVA_CORE:"Deploying TVA Core",
    FINISHED_TVA_CORE_DEPLOYMENT:"Finished TVA Core Deployment",
    RUNNING_EXPERIMENT:"Running Experiment",
    SUCCESS:"Success",
    FAIL:"Fail",
    COMPLETE:"Completed"
};

export const SERVER_API_URL = import.meta.env.VITE_SERVER_API_URL 
//export const SERVER_API_URL =  "http://127.0.0.1:5000/"

export const API_ENDPOINTS = {
	CREATE_JOB: `${SERVER_API_URL}/create_job`,
	REGISTER_DATA_OWNER: `${SERVER_API_URL}/register_data_owner`,
	SUBMIT_JOB: `${SERVER_API_URL}/submit_job`,
	GET_STATUS: `${SERVER_API_URL}/get_status`,
	DUMMY_POST: `${SERVER_API_URL}/dummy_post`,
};


export const SCHEMA_DATA_TYPES = {
	INTEGER: "INTEGER",
	STRING: "STRING",
	VARCHAR: "VARCHAR",
	CATEGORY: "CATEGORY",
};

// export const SERVER_API_URL = "http://localhost:3000";
