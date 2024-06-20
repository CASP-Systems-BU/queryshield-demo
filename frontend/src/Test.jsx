import React, { useState } from "react";
import { API_ENDPOINTS, SERVER_API_URL } from "./constants.js";

function DummyTest() {
	const [inputData, setInputData] = useState("This is some input data");

	const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			const response = await fetch(
				"https://storage.googleapis.com/gcp-mpc-demo-01c131f3-f546-4c30-b5b8-2e709e246c83//pmCwfYBpurM6w5lv8Ef89eqduqx1?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=mpc-demo-service-account%40secrecy-326917.iam.gserviceaccount.com%2F20240114%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20240114T002750Z&X-Goog-Expires=3600&X-Goog-SignedHeaders=host&X-Goog-Signature=646d88d00339b3b874446f2bc088d5a2d837f7b8a58dd4bdf3b93b148d27e971a6a9d47792c4482398fc7369aca950aec6aebf37ac351a034690737dcda3fd1876bc8148862b1ed5f1afc3cc9a509e4311eaee951d1c49395a50589abb056d95ce78e16533d8b2aa85515ff64de2662e70bf33311234695dbd7581b883663c2a9be8737f7ddf10ae902418f36948eb70adfad6d6a06ef232db58910f26a132fecae12e4e2af75cc0daa370a57ab46adb1a0bd9f0eacdfd9ea1a8865e2dc3402d61ce3fd935d4da60df3fa14d15208ec3bc6c6bbcaf608b1ab784f869a41fdef1e792227384812710b62f1feeb1f8c933cfed9",
				{
					method: "PUT", // Specify the method
					headers: {
						"x-ms-blob-type": "BlockBlob",
						// Add any other headers here
					},
					body: "your CSV data or Blob", // Set the body as the data you want to send
				}
			);
			const responseData = await response.json();
			console.log(responseData);
			// Handle the response data as needed
		} catch (error) {
			console.error("Error:", error);
		}
	};

	return (
		<div>
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					value={inputData}
					onChange={(e) => setInputData(e.target.value)}
				/>
				<button type="submit">Submit</button>
			</form>
		</div>
	);
}

export default DummyTest;
