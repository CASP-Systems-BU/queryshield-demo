import {
	ANALYSIS_STATUS,
	CLOUD_PROVIDERS,
	HONESTY_LEVEL,
	SCHEMA_DATA_TYPES,
	API_ENDPOINTS,
} from "../../constants.js";
import { getAnalysis } from "../../firebase/firebase";
import { useEffect, useState, useRef, useContext } from "react";
import AnalysisEntryDetails from "../../components/AnalysisEntryDetails";
import jspreadsheet from "jspreadsheet-ce";
import "../../../node_modules/jspreadsheet-ce/dist/jspreadsheet.css";
import { useParams } from "react-router-dom";
import { Navigate } from "react-router-dom";
import styles from "./style.module.css";
import Form from "react-bootstrap/Form";
import { Button, Container, Row, Col } from "react-bootstrap";
import useReqTVA from "../../hooks/useReqTVA";
import { UserContext } from "../../App";
import axios from "axios";
import { ACCESS_PERMISSION_ROLES } from "../../constants.js";

import {
	appendDataOwnerRegistration,
	updateAnalysis,
} from "../../firebase/firebase";
import { ColorRing } from "react-loader-spinner";

const UploadDataPage = () => {
	const fileInputRef = useRef(null);
	const userContext = useContext(UserContext);
	const [selectedFile, setSelectedFile] = useState(null);
	const [errors, setErrors] = useState([
	]);
	const UPLOAD_STATUS = {
		UPLOADED: "UPLOADED",
		FAILURE: "FAILURE",
		NOT_YET_UPLOADED: "NOT_YET_UPLOADED",
	};
	const [hasUploadSucceeded, setHasUploadSucceeded] = useState({
		status: UPLOAD_STATUS.NOT_YET_UPLOADED,
		message: "",
	});
	const spreadsheetRef = useRef();
	const { entryId } = useParams();
	const [formData, setFormData] = useState({
		analysisName: "",
		inputQuery: "",
		analysisDesc: "",
		serverHonestyLevel: HONESTY_LEVEL.MALICIOUS,
		cloudProviders: {
			[CLOUD_PROVIDERS.AWS]: false,
			[CLOUD_PROVIDERS.GOOGLE_CLOUD]: false,
			[CLOUD_PROVIDERS.AZURE]: false,
			[CLOUD_PROVIDERS.CHAMELEON]: false,
		},
		status: ANALYSIS_STATUS.CREATED,
		ownersRegistered: [],
		jobId: "",
	});
	const [isSpinnerLoading, setIsSpinnerLoading] = useState(false)
	const [schema, setSchema] = useState([
		{
			columnName: null,
			units: null,
			dataType: null,
			varCharUnits: null,
			categories: [],
		},
	]);
	const { apiReqError, axiosPostToTva } = useReqTVA();
	const [spreadsheet, setSpreadsheet] = useState(null);
	const handleFileChange = (e) => {
		setSelectedFile(e.target.files[0]);
	};
	const handleClearFile = () => {
		fileInputRef.current.value = "";
		setSelectedFile(null);
	};

	const handleUpload = async () => {
		function excelToDataframe(headers, data) {
			let ret = {};
			for (let i = 0; i < headers.length; i++) {
				let columnData = [];
				for (let j = 0; j < data.length; j++) {
					columnData.push(data[j][i]);
				}
				let headerString = headers[i];
				ret[headerString] = columnData;
			}
			return ret;
		}
		const verifyColumnDataType = (dataframe) => {
			let errorCoordinates = [];
			schema.forEach((schemaItem, col) => {
				dataframe[schemaItem.columnName].forEach((dfItem, row) => {
					console.log(row)
					if (dfItem == "") {
						return;
					}
					if (schemaItem.dataType == SCHEMA_DATA_TYPES.INTEGER) {
						const num = +dfItem;
						if (
							!(
								Number.isInteger(num) &&
								dfItem.trim() !== "" &&
								!dfItem.includes(".")
							)
						) {
							errorCoordinates.push({
								row: row + 1,
								col: col + 1,
								errorMessage:
									"not a valid integer (has letters/symbols)",
							});
						} else {
							dataframe[schemaItem.columnName][row] = parseInt(dfItem);
						}
					}
					else if (schemaItem.dataType == SCHEMA_DATA_TYPES.REAL) {
						// Check if the string is not a valid real number or contains alphabet characters
						if (
							!/^-?\d+(\.\d+)?$/.test(dfItem.trim()) ||
							/[a-zA-Z]/.test(dfItem.trim())
						) {
							errorCoordinates.push({
								row: row + 1,
								col: col + 1,
								errorMessage:
									"not a valid real number (has letters/symbols)",
							});
						} else {
							dataframe[schemaItem.columnName][row] = parseFloat(dfItem);
						}
					}
					else if (schemaItem.dataType == SCHEMA_DATA_TYPES.VARCHAR) {
						if (dfItem.length != schemaItem.varCharUnits) {
							errorCoordinates.push({
								row: row + 1,
								col: col + 1,
								errorMessage:
									"string longer than accepted length of " +
									schema.varCharUnits,
							});
						}
					} else if (schemaItem.dataType == SCHEMA_DATA_TYPES.CATEGORY) {
						dataframe[schemaItem.columnName][row] = schemaItem.categories.findIndex(cat => cat == dfItem)
					}
					console.log("Dataframe dtype")
					console.log(dataframe)
				});
			});
			return errorCoordinates;
		};
		function verifyNullCells(data) {
			let errorCoordinates = [];
			for (let row = 0; row < data.length; row++) {
				for (let col = 0; col < data[row].length; col++) {
					if (data[row][col] == "") {
						errorCoordinates.push({
							row: row + 1,
							col: col + 1,
							errorMessage: "cell is empty",
						});
					}
				}
			}
			return errorCoordinates;
		}
		const parseCSV = (text) => {
			const lines = text.split(/\r\n|\n/); // Split by new line
			const headers = lines[0].split(","); // First row for headers
			const dataRows = lines.slice(1).map((line) => line.split(",")); // Remaining rows
			return {
				headers,
				dataRows,
			};
		};
		async function readFileAsync(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();

				reader.onload = (e) => {
					const text = e.target.result;
					const { headers, dataRows } = parseCSV(text);
					resolve({ headers, dataRows });
				};

				reader.onerror = (e) => {
					reject(e);
				};

				reader.readAsText(file);
			});
		}
		let excelData;
		let excelHeaders;
		if (selectedFile != null) {
			try {
				let errors = [];
				const { headers, dataRows } = await readFileAsync(selectedFile);
				excelData = dataRows;
				excelHeaders = headers;
				const colNames = schema.map((c) => c.columnName);
				if (colNames.length != headers.length) {
					errors.push({
						row: "-",
						col: "-",
						errorMessage:
							"Number of columns for CSV file is not equal to required amount",
					});
				}
				for (let i = 0; i < colNames.length; i++) {
					if (headers[i] != colNames[i]) {
						errors.push({
							row: "-",
							col: "-",
							errorMessage:
								"Column" +
								(i + 1) +
								" column name does not match schema's column name",
						});
					}
				}
				if (errors.length > 0) {
					setErrors(errors);
					return;
				}
			} catch (error) {
				console.error("Error reading file:", error);
				setErrors([
					{
						row: "-",
						col: "-",
						errorMessage: "Error reading CSV file",
					},
				]);
				return;
			}
		} else {
			excelData = spreadsheet.getData();
			excelHeaders = spreadsheet.getHeaders().split(",");
		}
		const excelDataFrame = excelToDataframe(excelHeaders, excelData);
		const errorNullCells = verifyNullCells(excelData);
		const errorDataTypes = verifyColumnDataType(excelDataFrame);
		setErrors([...errorNullCells, ...errorDataTypes]);
		if (errorNullCells.length > 0 || errorDataTypes.length > 0) {
			return;
		}

		console.log("Dataframe Excel:")
		console.log(excelDataFrame)

		setIsSpinnerLoading(true)
		let res = await axiosPostToTva({
			data: {
				job_id: formData.jobId,
				data_owner: userContext.user.userId,
			},
			apiUrl: API_ENDPOINTS.REGISTER_DATA_OWNER,
		});

		if (res) {
			async function uploadFile(csv, url) {
				console.log("csv:", csv);
				console.log("typeof csv:", typeof csv);
				console.log("url:", url);
				console.log("typeof url:", typeof url);
				try {
					let response;
					if (typeof url === "string") {
						if (url.includes("chameleoncloud")) {
							// chameleon url doesn't need the headers to PUT
							response = await axios.put(url, csv);
						} else {
							response = await axios.put(url, csv, {
								headers: {
									"x-ms-blob-type": "BlockBlob",
									"Content-Type": "text/csv",
								},
							});
						}
						console.log(
							"File uploaded successfully",
							response.data
						);
					} else if (typeof url === "object" && url !== null) {
						const formData = new FormData();

						for (const key in url.fields) {
							formData.append(key, url.fields[key]);
						}

						const blob = new Blob([csv], { type: "text/csv" });
						formData.append("file", blob);

						console.log("formData:", formData);

						response = await axios.post(url.url, formData, {
							headers: {
								"Content-Type": "multipart/form-data",
							},
						});
						console.log(
							"File uploaded successfully",
							response.data
						);
					}
					return;
				} catch (error) {
					console.error("Error in file upload", error);
					throw error;
				}
			}

			function secret_share(data) {
				var shares1 = new BigUint64Array(1);
				var shares2 = new BigUint64Array(1);
				var shares3 = new BigUint64Array(1);
				crypto.getRandomValues(shares1);
				crypto.getRandomValues(shares2);
				if (typeof (data) === 'string') {
					shares3[0] = 0n ^ shares1[0] ^ shares2[0];
					shares1[0] ^= BigInt(data)
				} else if (typeof (data === 'number')) {
					shares3[0] = 0n - shares1[0] - shares2[0];
					shares1[0] += BigInt(data)
				}
				return [shares1[0], shares2[0], shares3[0]]
			}



			function secret_share_arithmetic(_data, _replication_factor) {
				// makes sure _replication_factor > 2
				if (_replication_factor < 3) {
					throw "Replication factor must be greater than 2";
				}

				var result_shares = new Int32Array(_replication_factor);
				crypto.getRandomValues(result_shares);
				result_shares[0] = Number(_data);
				for (var i = 1; i < _replication_factor; i++) {
					result_shares[0] -= result_shares[i];
				}

				return result_shares;
			}

			function secret_share_boolean(_data, _replication_factor) {
				// makes sure _replication_factor > 2
				if (_replication_factor < 3) {
					throw "Replication factor must be greater than 2";
				}

				var result_shares = new Int32Array(_replication_factor);
				crypto.getRandomValues(result_shares);
				result_shares[0] = Number(_data);
				for (var i = 1; i < _replication_factor; i++) {
					result_shares[0] ^= result_shares[i];
				}

				return result_shares;
			}

			// Function that takes in the table schema, data and replication factor 
			// and returns the secret shared data. The data is secret shared using the
			// both the arithmetic and boolean secret sharing schemes. For each input column,
			// we get _replication_factor output secret shared columns for arithmetic secret sharing
			// and another _replication_factor output secret shared columns for boolean secret sharing.
			// For example, for input column 'x' with replication factor 3, we get 6 output columns,
			// named '[x]_1', '[x]_2', '[x]_3', 'x_1', 'x_2', 'x_3'.
			// The first 3 columns with the square brackets are for boolean secret sharing.
			// The next 3 columns are for arithmetic secret sharing.
			// The output is a map representing the content of the resulting CSV file.
			function secret_share_csv(_table_schema, _data, _replication_factor) {
				// Initialize the output data as a map of column names to secret shared data
				let output_data = new Map();
				let rows_number = _data[Object.keys(_data)[0]].length;

				// Iterate over all columns in the input data
				for (let column_name of _table_schema) {
					// create '[x]_i' and 'x_i' column names
					for (let i = 0; i < _replication_factor; i++) {
						output_data.set(`${column_name}_${i}`, new Int32Array(rows_number));
					}

					for (let i = 0; i < _replication_factor; i++) {
						output_data.set(`[${column_name}]_${i}`, new Int32Array(rows_number));
					}

					// iterate over rows in the column
					for (let j = 0; j < rows_number; j++) {
						let shares_1 = secret_share_arithmetic(_data[column_name][j], _replication_factor);
						for (let i = 0; i < _replication_factor; i++) {
							output_data.get(`${column_name}_${i}`)[j] = shares_1[i];
						}

						let shares_2 = secret_share_boolean(_data[column_name][j], _replication_factor);
						for (let i = 0; i < _replication_factor; i++) {
							output_data.get(`[${column_name}]_${i}`)[j] = shares_2[i];
						}
					}
				}

				return output_data;
			}

			// A function convert the csv table to csv file content
			function csv_table_to_csv_file(_table) {
				// Convert the output data to a CSV string
				let csv_data = "";

				// Add the headers
				let headers = Array.from(_table.keys());
				csv_data += headers.join(",") + "\n";
				let rows_number = _table.get(headers[0]).length;

				// Add the rows
				for (let i = 0; i < rows_number; i++) {
					let row = [];
					for (let header of headers) {
						row.push(_table.get(header)[i]);
					}
					csv_data += row.join(",") + "\n";
				}

				return csv_data;
			}



			let presignedUrls = res.data.presigned_urls;
			try {
				// let buckets = [...presignedUrls.map(e => { return [new Map()] })]
				// for (let head of Object.keys(excelDataFrame)) {
				// 	for (let item of excelDataFrame[head]) {
				// 		let shares = secret_share(item)
				// 		for (let i = 0; i < shares.length; i++) {
				// 			buckets[i].push(shares[i])
				// 			buckets[(i + 1) % buckets.length].push(shares[i])
				// 		}
				// 	}
				// }

				let table_schema = schema.map(s => s.columnName)
				let parties_number = presignedUrls.length
				let csv_table = secret_share_csv(table_schema, excelDataFrame, parties_number);

				let parties_data = [...presignedUrls.map(e => { return new Map() })]
				let party_replication_factor = parties_number - 1

				for (let i = 0; i < parties_number; i++) {
					for (let _header of table_schema) {
						for (let j = 0; j < party_replication_factor; j++) {
							parties_data[i].set(`${_header}_${j}`, csv_table.get(`${_header}_${(i+j)%parties_number}`))
						}

						for (let j = 0; j < party_replication_factor; j++) {
							parties_data[i].set(`[${_header}]_${j}`, csv_table.get(`[${_header}]_${(i+j)%parties_number}`))
						}
					}
				}

				await Promise.all(parties_data.map((b, index) => {
					// generate the CSV file
					let csv_data = csv_table_to_csv_file(b)

					return uploadFile(csv_data, presignedUrls[index])
				}))




				await appendDataOwnerRegistration(
					userContext.user.userId,
					entryId
				);

				await updateAnalysis(entryId, {
					...formData,
					schema,
					ownersRegistered: [
						...formData.ownersRegistered,
						userContext.user.userId,
					],
				});
			} catch (error) {
				setHasUploadSucceeded({
					status: UPLOAD_STATUS.FAILURE,
					message: "Error:" + error,
				});
				return;
			}

			try {
				setHasUploadSucceeded({
					status: UPLOAD_STATUS.UPLOADED,
					message: "",
				});
			} catch (error) {
				setHasUploadSucceeded({
					status: UPLOAD_STATUS.FAILURE,
					message: "Error:" + error,
				});
				return;
			}


			setHasUploadSucceeded({
				status: UPLOAD_STATUS.UPLOADED,
				message: "",
			});
		}
		setIsSpinnerLoading(false);
	};

	const UploadedMessage = ({ message, status }) => {
		switch (status) {
			case UPLOAD_STATUS.FAILURE:
				return <h4 id={`${styles.errorUploadMessage}`}>{message}</h4>;
			case UPLOAD_STATUS.UPLOADED:
				return (
					<h4 id={`${styles.successUploadMessage}`}>
						Successful Sharing
					</h4>
				);
			default:
				break;
		}
	};

	useEffect(() => {
		getAnalysis(entryId).then((a) => {
			setFormData(a);
			setSchema(a.schema);
			const excelColumnSchema = [];
			a.schema.forEach((s) => {
				let excelCol = {
					title: s.columnName,
					type: "numeric",
					width: 120,
				};
				switch (s.dataType) {
					case SCHEMA_DATA_TYPES.INTEGER:
						excelCol.type = "numeric";
						break;
					case SCHEMA_DATA_TYPES.REAL:
						excelCol.type = "numeric";
						break;
					case SCHEMA_DATA_TYPES.STRING:
						excelCol.type = "text";
						break;
					case SCHEMA_DATA_TYPES.VARCHAR:
						excelCol.type = "text";
						break;
					case SCHEMA_DATA_TYPES.CATEGORY:
						excelCol.type = "dropdown";
						excelCol.source = s.categories;
						break;
					default:
						break;
				}
				excelColumnSchema.push(excelCol);
			});
			if (!spreadsheetRef.current.jspreadsheet) {
				// todo-es : prevent the data owner to create new columns, only create new rows
				setSpreadsheet(
					jspreadsheet(spreadsheetRef.current, {
						allowInsertColumn: false,
						allowDeleteColumn: false,
						allowRenameColumn: false,
						data: [[]],
						minDimensions: [excelColumnSchema.length, 1],
						columns: [...excelColumnSchema],
					})
				);
			}
		});
	}, [entryId]);


	if (formData?.ownersRegistered?.includes(userContext.user.userId)) {
		if (userContext.user.accessPermission == ACCESS_PERMISSION_ROLES.DATA_OWNER) {
			return <Navigate to="/analysis-catalog" />;
		} else {
			return <Navigate to="/create-analysis" />;
		}
	}
	return (
		<Container>
			<h1
				style={{
					textAlign: "center"
				}}
			>
				Share Data
			</h1>
			<AnalysisEntryDetails formData={formData} schema={schema} />
			<div className={`${styles.uploadDataContainer}`}>
				<h4>Upload as CSV</h4>
				{hasUploadSucceeded.status != UPLOAD_STATUS.UPLOADED
					&&
					<Container className={`${styles.csvInput}`}>
						<Row className="mb-3">
							<Col>
								<Form.Group controlId="formFile">
									<Form.Control
										ref={fileInputRef}
										type="file"
										onChange={handleFileChange}
									/>
								</Form.Group>
							</Col>
							<Col xs="auto">
								<Button variant="warning" onClick={handleClearFile}>
									Clear File
								</Button>
							</Col>
						</Row>
					</Container>
				}
				{errors.length > 0 && (
					<h5 className={`${styles.errorMessageHeader}`}>Errors</h5>
				)}
				{
					hasUploadSucceeded.status != UPLOAD_STATUS.UPLOADED && (
						<>
							<ul className={`${styles.errorsList}`}>
								{errors.map(({ row, col, errorMessage }, index) => {
									return (
										<li
											key={`csv-error-${index}`}
											className={`${styles.errorMessage}`}
										>
											{`Row: ${row}, Col: ${col}, Message: ${errorMessage}`}
										</li>
									);
								})}
							</ul>
							<h4>or enter data here</h4>
							<div className={`${styles.spreadsheet}`}>
								<div ref={spreadsheetRef}></div>
							</div>
						</>
					)
				}
				<br></br>
				{apiReqError.hasError && (
					<h4 style={{ color: "red" }}>{apiReqError.message}</h4>
				)}
				<UploadedMessage
					message={hasUploadSucceeded.message}
					status={hasUploadSucceeded.status}
				/>

				<ColorRing
					visible={isSpinnerLoading}
					height="80"
					width="80"
					ariaLabel="color-ring-loading"
					wrapperStyle={{}}
					wrapperClass="color-ring-wrapper"
					colors={['#088F8F', '#088F8F', '#088F8F', '#088F8F', '#088F8F']}
				/>
				{formData.analysisName != "" && !isSpinnerLoading && hasUploadSucceeded.status !== UPLOAD_STATUS.UPLOADED && (
					<Button variant="success" onClick={handleUpload}>
						Secret Share Data
					</Button>
				)}
			</div>
		</Container>
	);
};
export default UploadDataPage;
