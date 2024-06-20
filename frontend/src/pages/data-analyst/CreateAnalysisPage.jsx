import {
	Stack,
	Form,
	Row,
	Col,
	DropdownButton,
	Dropdown,
	Button,
	Container,
} from "react-bootstrap";
import {
	ColorRing
} from "react-loader-spinner"
import {
	ANALYSIS_STATUS,
	API_ENDPOINTS,
	CLOUD_PROVIDERS,
	CLOUD_PROVIDERS_API,
	HONESTY_LEVEL,
	SCHEMA_DATA_TYPES,
	HONESTY_LEVEL_API,
} from "../../constants.js";
import { IoIosCloseCircleOutline, IoIosClose } from "react-icons/io";
import { useContext, useRef, useState } from "react";
import { UserContext } from "../../App";
import { createAnalysis } from "../../firebase/firebase";
import parser from "js-sql-parser";
import useReqTVA from "../../hooks/useReqTVA";
const CreateAnalysisPage = () => {
	const colFitToContent = {
		xs: "auto",
		sm: "auto",
		md: "auto",
		lg: "auto",
		xl: "auto",
		xxl: "auto",
	};
	const scrollToRefs = {
		analysisNameRef: useRef(null),
		sqlQueryRef: useRef(null),
		securityLevelRef: useRef(null),
		schemaRef: useRef(null),
	};

	const BORDER_ERROR_STYLE = "red solid 2px";
	const userContext = useContext(UserContext);
	const [formData, setFormData] = useState({
		dataAnalystId: userContext.user.userId,
		analysisName: "",
		inputQuery: "",
		analysisDesc: "",
		serverHonestyLevel: HONESTY_LEVEL.MALICIOUS,
		cloudProviders: {
			[CLOUD_PROVIDERS.AWS]: true,
			[CLOUD_PROVIDERS.GOOGLE_CLOUD]: true,
			[CLOUD_PROVIDERS.AZURE]: true,
			[CLOUD_PROVIDERS.CHAMELEON]: true,
		},
	});

	const [isSpinnerLoading, setIsSpinnerLoading] = useState(false)
	const [schema, setSchema] = useState({
		0: {
			columnName: "",
			units: "",
			dataType: null,
			varCharUnits: null,
			categories: ["New Category"],
		},
	});

	const clearForm = () => {
		setFormData({
			dataAnalystId: userContext.user.userId,
			analysisName: "",
			inputQuery: "",
			analysisDesc: "",
			serverHonestyLevel: HONESTY_LEVEL.MALICIOUS,
			cloudProviders: {
				[CLOUD_PROVIDERS.AWS]: true,
				[CLOUD_PROVIDERS.GOOGLE_CLOUD]: true,
				[CLOUD_PROVIDERS.AZURE]: true,
				[CLOUD_PROVIDERS.CHAMELEON]: true,
			},
		});
		setSchema({
			0: {
				columnName: null,
				units: "",
				dataType: null,
				varCharUnits: null,
				categories: ["New Category"],
			},
		});
	};
	const cloudProvidersMali = {
		[CLOUD_PROVIDERS.AWS]: true,
		[CLOUD_PROVIDERS.GOOGLE_CLOUD]: true,
		[CLOUD_PROVIDERS.AZURE]: true,
		[CLOUD_PROVIDERS.CHAMELEON]: true,
	};
	const cloudProvidersSemi = {
		[CLOUD_PROVIDERS.AWS]: true,
		[CLOUD_PROVIDERS.GOOGLE_CLOUD]: true,
		[CLOUD_PROVIDERS.AZURE]: true,
		[CLOUD_PROVIDERS.CHAMELEON]: false,
	};

	const ERROR_MESSAGE = {
		SQL_PARSING: "SQL Query is invalid",
		MALI_REQ_NOT_MET:
			"Malicious threat model needs 4/4 cloud providers selected",
		SEMI_HONEST_REQ_NOT_MET:
			"Semi-honest threat model needs 3/4 cloud providers selected",
		ANALYSIS_NAME: "No analysis name provided",
		SCHEMA_COLUMN: "Needs column name and data type",
	};

	const [sqlError, setSqlError] = useState({
		hasError: false,
	});

	const [cloudProviderError, setCloudProviderError] = useState({
		hasError: false,
		message: "",
	});

	const [analysisNameError, setAnalysisNameError] = useState({
		hasError: false,
	});

	const { apiReqError, axiosPostToTva, setApiReqError } = useReqTVA();

	const [successfulSubmission, setSuccessfulSubmission] = useState(false);

	function hasTrueValue(obj) {
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const innerObj = obj[key];
				// Check if at least one property in the inner object has a value of true
				if (Object.values(innerObj).some((value) => value === true)) {
					return true;
				}
			}
		}
		return false;
	}
	const [schemaError, setSchemaError] = useState({
		0: {
			columnName: false,
			units: false,
			dataType: false,
			varCharUnits: false,
			categories: false,
		},
	});
	const checkValidSchema = () => {
		let hasError = false;
		let newSchema = { ...schemaError };
		Object.keys(schema).forEach((key) => {
			const temp = {
				[key]: {
					columnName: false,
					units: false,
					dataType: false,
					varCharUnits: false,
					categories: false,
				},
			};
			if (!schema[key].columnName) {
				temp[key].columnName = true;
				hasError = true;
			}
			if (
				schema[key].dataType == "VARCHAR" &&
				!schema[key].varCharUnits
			) {
				temp[key].varCharUnits = true;
				hasError = true;
			}
			if (!schema[key].dataType) {
				temp[key].dataType = true;
				hasError = true;
			}
			newSchema = {
				...newSchema,
				...temp,
			};
		});
		setSchemaError({ ...newSchema });
		return hasError;
	};
	const handleCreateNewAnalysis = async () => {
		setSuccessfulSubmission(false);
		clearForm();
		setApiReqError({
			hasError: false,
			message: "",
		});
	};

	const handleSubmitForm = async () => {
		let hasError = false;
		let scrollToRef = null;
		const setScrollToRef = (ref) => {
			if (!scrollToRef) {
				scrollToRef = ref;
			}
		};

		if (!formData.analysisName) {
			hasError = true;
			console.log("no analysis name");
			setAnalysisNameError({ hasError: true });
			setScrollToRef(scrollToRefs.analysisNameRef);
		} else {
			setAnalysisNameError({ hasError: false });
		}

		try {
			parser.parse(formData.inputQuery);
			setSqlError({
				hasError: false,
			});
		} catch (error) {
			setSqlError({
				hasError: true,
			});
			hasError = true;
			setScrollToRef(scrollToRefs.sqlQueryRef);
		}

		const cloudProvidersValues = Object.values(formData.cloudProviders);
		let trueValues = 0;
		cloudProvidersValues.forEach((boolVal) => {
			if (boolVal) {
				trueValues++;
			}
		});

		if (
			trueValues < 3 &&
			formData.serverHonestyLevel === HONESTY_LEVEL.SEMIHONEST
		) {
			setCloudProviderError({
				hasError: true,
				message: ERROR_MESSAGE.SEMI_HONEST_REQ_NOT_MET,
			});
			hasError = true;
			setScrollToRef(scrollToRefs.securityLevelRef);
		} else if (
			trueValues < 4 &&
			formData.serverHonestyLevel === HONESTY_LEVEL.MALICIOUS
		) {
			setCloudProviderError({
				hasError: true,
				message: ERROR_MESSAGE.MALI_REQ_NOT_MET,
			});
			hasError = true;
			setScrollToRef(scrollToRefs.securityLevelRef);
		} else {
			setCloudProviderError({
				hasError: false,
				message: "",
			});
		}

		if (checkValidSchema()) {
			hasError = true;
			setScrollToRef(scrollToRefs.schemaRef);
		}

		if (hasError) {
			scrollToRef.current.scrollIntoView({
				behavior: "smooth",
			});
			return;
		}

		const apiSchema = {};
		// todo-es : how are categories represented?
		Object.keys(schema).forEach((k) => {
			apiSchema[schema[k].columnName] = schema[k].units;
		});

		setIsSpinnerLoading(true)
		let res = await axiosPostToTva({
			data: {
				analysis_name: formData.analysisName,
				query_sql: formData.inputQuery,
				security_level: HONESTY_LEVEL_API[formData.serverHonestyLevel],
				cloud_providers: Object.keys(formData.cloudProviders).reduce(
					(acc, k) => {
						if (formData.cloudProviders[k]) {
							acc.push(CLOUD_PROVIDERS_API[k]);
						}
						return acc;
					},
					[]
				),
				schema: apiSchema,
			},
			apiUrl: API_ENDPOINTS.CREATE_JOB,
		});
		try {
			if (res) {
				setSuccessfulSubmission(true);
				await createAnalysis({
					...formData,
					schema: [...Object.values(schema)],
					status: ANALYSIS_STATUS.CREATED,
					ownersRegistered: [],
					jobId: res.data.job_id,
				});
			}
		} catch (error) {
			setApiReqError({
				hasError: true,
				message: error
			})
		}
		setIsSpinnerLoading(false);
	};

	const addColumn = () => {
		setSchema((prevSchema) => ({
			...prevSchema,
			[Object.keys(prevSchema).length]: {
				columnName: "",
				units: "",
				dataType: null,
				varCharUnits: null,
				categories: [],
			},
		}));
		setSchemaError((prevSchemaError) => ({
			...prevSchemaError,
			[Object.keys(prevSchemaError).length]: {
				columnName: false,
				units: false,
				dataType: false,
				varCharUnits: false,
				categories: false,
			},
		}));
	};

	const removeColumn = (schemaIndex) => {
		if (successfulSubmission) {
			return;
		}
		setSchema((prevSchema) => {
			const newSchema = { ...prevSchema };
			delete newSchema[schemaIndex];
			return newSchema;
		});
	};
	const addCategory = (schemaIndex) => {
		const categories = schema[schemaIndex].categories;
		categories.push("New Category");
		setSchema((prevSchema) => ({
			...prevSchema,
			[schemaIndex]: {
				...schema[schemaIndex],
				categories,
			},
		}));
	};
	const removeCategory = (schemaIndex, categoryIndex) => {
		if (successfulSubmission) {
			return;
		}
		const categories = schema[schemaIndex].categories;
		categories.splice(categoryIndex, 1);
		setSchema((prevSchema) => ({
			...prevSchema,
			[schemaIndex]: {
				...schema[schemaIndex],
				categories,
			},
		}));
	};
	const editCategory = (newText, schemaIndex, categoryIndex) => {
		const categories = schema[schemaIndex].categories;
		categories[categoryIndex] = newText;
		setSchema((prevSchema) => ({
			...prevSchema,
			[schemaIndex]: {
				...schema[schemaIndex],
				categories,
			},
		}));
	};

	const errorStyling = { color: "red" };

	return (
		<Container
			style={{
				width: "100%",
			}}
		>
			<h1 style={{ textAlign: "center" }}>Create New Analysis</h1>
			<br></br>
			<h4 ref={scrollToRefs.schemaRef}>Data Schema</h4>
			<br></br>
			<Container
				style={{
				}}
			>

				{Object.keys(schema).map((i) => {
					return (
						<Row
							className="mb-3 w-100"
							key={`schema-entry-${i}`}
						>
							<Col {...colFitToContent}>
								<div
									style={{
										margin: "auto",
									}}
								>
									<IoIosCloseCircleOutline
										color="gray"
										fontSize={30}
										onClick={() => {
											removeColumn(i);
										}}
									/>
								</div>
							</Col>
							<Col>
								<Form.Control
									style={{
										border:
											schemaError[i].columnName &&
											BORDER_ERROR_STYLE,
									}}
									type="text"
									placeholder="Column Name"
									value={schema[i].columnName || ""}
									onChange={(e) => {
										const updatedColumnName =
											e.target.value;
										setSchema((prevSchema) => ({
											...prevSchema,
											[i]: {
												...prevSchema[i],
												columnName:
													updatedColumnName,
											},
										}));
									}}
								/>
							</Col>
							<Col>
								<Form.Control
									style={{
										border:
											schemaError[i].units &&
											BORDER_ERROR_STYLE,
									}}
									placeholder="Units (e.g. lbs, kg, MM/dd/yyyy)"
									value={schema[i].units || ""}
									onChange={(e) => {
										const updatedUnits = e.target.value;
										setSchema((prevSchema) => ({
											...prevSchema,
											[i]: {
												...prevSchema[i],
												units: updatedUnits,
											},
										}));
									}}
								/>
							</Col>
							<Col {...colFitToContent}>
								<DropdownButton
									id="dropdown-data-type"
									title={
										schema[i].dataType || "Data Type"
									}
									style={{
										border:
											schemaError[i].dataType &&
											BORDER_ERROR_STYLE,
										borderRadius: "10px",
									}}
								>
									{Object.values(SCHEMA_DATA_TYPES).map(
										(dataType) => (
											<Dropdown.Item
												key={`data-type-${dataType}`}
												onClick={() => {
													setSchema({
														...schema,
														[i]: {
															...schema[i],
															dataType:
																dataType,
														},
													});
												}}
											>
												{dataType}
											</Dropdown.Item>
										)
									)}
								</DropdownButton>
							</Col>
							<Col>
								{schema[i].dataType ==
									SCHEMA_DATA_TYPES.VARCHAR && (
										<Form.Control
											style={{
												border: schemaError[i]
													.varCharUnits
													? BORDER_ERROR_STYLE
													: "black solid 2px",
											}}
											as="input"
											type="number"
											min="1"
											max="100"
											value={schema[i].varCharUnits}
											onChange={(e) => {
												setSchema((prevSchema) => ({
													...prevSchema,
													[i]: {
														...schema[i],
														varCharUnits:
															e.target.value,
													},
												}));
											}}
											title=" "
										></Form.Control>
									)}
								<Stack gap={2}>
									{schema[i].dataType ==
										SCHEMA_DATA_TYPES.CATEGORY &&
										schema[i].categories.map(
											(category, categoryIndex) => {
												return (
													<Stack
														direction="horizontal"
														gap={2}
													>
														<Form.Control
															style={{
																border: "black solid 2px",
															}}
															value={category}
															onChange={(e) =>
																editCategory(
																	e.target
																		.value,
																	i,
																	categoryIndex
																)
															}
															title=" "
														></Form.Control>
														<IoIosClose
															color="red"
															fontSize={30}
															onClick={() => {
																removeCategory(
																	i,
																	categoryIndex
																);
															}}
														/>
													</Stack>
												);
											}
										)}
									{schema[i].dataType ==
										SCHEMA_DATA_TYPES.CATEGORY && (
											<Button
												variant="success"
												width="fit-content"
												onClick={() => addCategory(i)}
											>
												Add New Category
											</Button>
										)}
								</Stack>
							</Col>
						</Row>
					);
				})}
			</Container>
			<Form>
				<fieldset disabled={successfulSubmission}>

					{hasTrueValue(schemaError) && (
						<p style={errorStyling}>
							{ERROR_MESSAGE.SCHEMA_COLUMN}
						</p>
					)}
					{!successfulSubmission && (
						<Button
							variant="primary"
							className="bg-success mb-3"
							type="button"
							size="sm"
							onClick={addColumn}
						>
							+ New Column
						</Button>
					)}

					<br></br><br></br>

					<h4>Analysis Details</h4>
					{analysisNameError.hasError && (
						<p style={errorStyling}>
							{ERROR_MESSAGE.ANALYSIS_NAME}
						</p>
					)}
					<Form.Group
						ref={scrollToRefs.analysisNameRef}
						className="mb-3 mt-3"
						style={{
							border:
								analysisNameError.hasError &&
								BORDER_ERROR_STYLE,
							borderRadius: "2px",
						}}
					>
						<Form.Control
							type="text"
							placeholder="Analysis Name"
							value={formData.analysisName || ""}
							onChange={(e) => {
								setFormData((prevFormData) => ({
									...prevFormData,
									analysisName: e.target.value,
								}));
							}}
						/>
					</Form.Group>
					<Form.Group className="mb-3">
						{sqlError.hasError && (
							<p style={errorStyling}>
								{ERROR_MESSAGE.SQL_PARSING}
							</p>
						)}
						<Form.Control
							ref={scrollToRefs.sqlQueryRef}
							style={{
								border: sqlError.hasError && BORDER_ERROR_STYLE,
							}}
							rows={9}
							as="textarea"
							type="text"
							placeholder="Input Query Here"
							value={formData.inputQuery || ""}
							onChange={(e) => {
								setFormData((prevFormData) => ({
									...prevFormData,
									inputQuery: e.target.value,
								}));
							}}
						/>
					</Form.Group>
					<Form.Group className="mb-3">
						<Form.Control
							rows={5}
							as="textarea"
							type="text"
							placeholder="Analysis Description"
							value={formData.analysisDesc || ""}
							onChange={(e) => {
								setFormData((prevFormData) => ({
									...prevFormData,
									analysisDesc: e.target.value,
								}));
							}}
						/>
					</Form.Group>

					{cloudProviderError.hasError && (
						<p style={errorStyling}>{cloudProviderError.message}</p>
					)}

					<br></br>

					<Row ref={scrollToRefs.securityLevelRef}>
						<h4>Threat Model</h4>
						<Col>
							{Object.keys(HONESTY_LEVEL).map((honestyType) => (
								<div key={HONESTY_LEVEL[honestyType]}>
									<Form.Check
										checked={
											HONESTY_LEVEL[honestyType] ==
											formData.serverHonestyLevel
										}
										id={`honesty-type-${HONESTY_LEVEL[honestyType]}`}
										type="radio"
										label={HONESTY_LEVEL[honestyType]}
										onChange={() => {
											if (
												HONESTY_LEVEL[honestyType] ===
												HONESTY_LEVEL.MALICIOUS
											) {
												setFormData((prevFormData) => ({
													...prevFormData,
													cloudProviders: {
														...cloudProvidersMali,
													},
													serverHonestyLevel:
														HONESTY_LEVEL[
														honestyType
														],
												}));
											} else {
												console.log("HERE");
												setFormData((prevFormData) => ({
													...prevFormData,
													cloudProviders: {
														...cloudProvidersSemi,
													},
													serverHonestyLevel:
														HONESTY_LEVEL[
														honestyType
														],
												}));
											}
										}}
									/>
								</div>
							))}
						</Col>
						<Col>
							<div>
								<Form.Label>Cloud Provider</Form.Label>
								{Object.keys(CLOUD_PROVIDERS).map(
									(providerType) => (
										<div
											key={CLOUD_PROVIDERS[providerType]}
											className="mb-3"
										>
											<Form.Check
												id={`provider-type-${CLOUD_PROVIDERS[providerType]}`}
												type="switch"
												label={
													CLOUD_PROVIDERS[
													providerType
													]
												}
												checked={
													providerType === CLOUD_PROVIDERS.AWS
														? true	// AWS is always checked
														: formData.cloudProviders[CLOUD_PROVIDERS[providerType]]	// Other providers based on formData
												}
												disabled={providerType === CLOUD_PROVIDERS.AWS}	// Disable the switch for AWS to prevent changes
												onChange={(e) => {
													setFormData(
														(prevFormData) => ({
															...prevFormData,
															cloudProviders: {
																...prevFormData.cloudProviders,
																[CLOUD_PROVIDERS[
																	providerType
																]]:
																	e.target
																		.checked,
															},
														})
													);
												}}
											/>
										</div>
									)
								)}
							</div>
						</Col>
					</Row>

				</fieldset>
			</Form>
			<Container
				style={{
					marginLeft: 0,
					padding: 0,
				}}
			>
				{apiReqError.hasError && (
					<h4 style={{ color: "red" }}>{apiReqError.message}</h4>
				)}
				<ColorRing
					visible={isSpinnerLoading}
					height="80"
					width="80"
					ariaLabel="color-ring-loading"
					wrapperStyle={{}}
					wrapperClass="color-ring-wrapper"
					colors={['#088F8F', '#088F8F', '#088F8F', '#088F8F', '#088F8F']}
				/>
				{successfulSubmission ? (
					<h4 style={{ color: "green" }}>Registered</h4>
				) : (
					!isSpinnerLoading && (

						<Button
							variant="primary"
							size="lg"
							className="bg-success"
							type="button"
							onClick={handleSubmitForm}
						>
							Register
						</Button>
					)
				)}
				{successfulSubmission && (
					<Button
						variant="primary"
						size="sm"
						className="bg-success"
						type="button"
						onClick={handleCreateNewAnalysis}
					>
						Create new analysis
					</Button>
				)}
			</Container>
		</Container>
	);
};
export default CreateAnalysisPage;
