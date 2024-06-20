import { useState } from "react";
import axios from "axios";

const useReqTVA = () => {
	const [apiReqError, setApiReqError] = useState({
		hasError: false,
		message: "",
	});

	const axiosPostToTva = async ({ data, apiUrl }) => {
		try {
			const res = await axios.post(apiUrl, data);
			return res;
		} catch (error) {
			if (error.response) {
				console.error("Error Response Data:", error.response.data);
				console.error("Error Response Status:", error.response.status);
				console.error(
					"Error Response Headers:",
					error.response.headers
				);
			} else if (error.request) {
				console.error("Error Request:", error.request);
			} else {
				console.error("Error Message:", error.message);
			}
			if (error?.response?.data) {
				setApiReqError({
					hasError: true,
					message: error.response.data,
				});
			} else {
				setApiReqError({
					hasError: true,
					message: "Error with create new analysis",
				});
			}
			return null;
		}
	};

	return {
		apiReqError,
		axiosPostToTva,
		setApiReqError,
	};
};

export default useReqTVA;
