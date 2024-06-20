import {
	ANALYSIS_STATUS,
	CLOUD_PROVIDERS,
	HONESTY_LEVEL,
} from "../../constants";
import { useParams } from "react-router-dom";
import { getAnalysis, onSnapshotResult } from "../../firebase/firebase";
import { useEffect, useState, useRef } from "react";
import jspreadsheet from "jspreadsheet-ce";
import * as math from "mathjs"
import style from "../../components/style.module.css"
import { Stack, Table, Row, Col, Form } from "react-bootstrap";
import AnalysisDataType from "../../components/AnalysisDataType";
import Chart from "chart.js/auto";

const DataAnalysisEntry = () => {
	const spreadsheetRef = useRef()
	const totalWageCtxRef = useRef(null);
	const degreeWageCtxRef = useRef(null);
	const regionWageCtxRef = useRef(null);
	const yoeCtxRef = useRef(null);

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
		ownersRegistered: 0,
	});
	const [schema, setSchema] = useState([
		{
			columnName: null,
			units: null,
			dataType: null,
			varCharUnits: null,
			categories: [],
		},
	]);

	const [spreadsheet, setSpreadsheet] = useState(null)

	// Use "hasResult" to address the issue where the UI shows "Pending" even when results exist but take a long time to download and reconstruct.
	const [hasResult, setHasResult] = useState(false);

	// const [academiaQuery, setAcademiaQuery] = useState(false);
	const WAGE_GAP_FIREBASE_DOC_ID = "B2Ym23BSiL39ARQ5T72p";
	const academiaQuery = entryId == WAGE_GAP_FIREBASE_DOC_ID;	// A hack way to check if it's wage gap or not.

	// Define downloadCSVs through presigned urls
	async function downloadCSVs(urls) {
		const fetchPromises = urls.map(async (url) => {
			const response = await fetch(url);
			if (response.ok) {
				return await response.text();
			} else {
				console.error("HTTP-Error: " + response.status);
				return null; // Or handle the error as you see fit
			}
		});

		// Wait for all fetch requests to complete
		const csvDataList = await Promise.all(fetchPromises);

		// Filter out any null values in case of errors
		return csvDataList.filter(data => data !== null);
	}

	// Reconstruct
	function reconstructShares(resultSharesList) {
		let resultSharesCleaned = Array(resultSharesList.length)
		let columnNames = null
		let i = 0

		// iterate over each party's shares
		resultSharesList.forEach(resultShares => {
			// split into lines, then split lines into words
			const lines = resultShares.trim().split("\n");
			const words = lines.map(line => line.split(','))

			// filter out duplicate unnecessary shares
			// detect unnecessary shares by the _1 or _2 after the name
			let goodColumns = []
			let goodColumnNames = []
			for (let j = 0; j < words[0].length; j++) {
				if (words[0][j].includes("_0")) {
					goodColumns.push(j)
					goodColumnNames.push(words[0][j].slice(0, -2))
				}
			}
			if (columnNames == null) {
				columnNames = goodColumnNames
			}

			const matrix = math.matrix(lines.map(line => line.split(',').map(Number)));

			// select only the good columns
			let filteredMatrix = math.zeros(matrix.size()[0], 0);
			goodColumns.forEach(i => {
				filteredMatrix = math.concat(filteredMatrix, matrix.subset(math.index(math.range(0, matrix.size()[0]), i)), 1);
			});

			const numRows = math.size(matrix)._data[0]

			// convert to int32 type to avoid issues with native JS numbers
			let int32matrix = Array(numRows - 1)
			for (let row = 1; row < numRows; row++) {
				int32matrix[row - 1] = new Int32Array(filteredMatrix.toArray()[row])
			}

			resultSharesCleaned[i] = int32matrix
			i++
		});
		console.log("Pre-reconstruction data:", resultSharesCleaned)

		const numRows = resultSharesCleaned[0].length
		const numCols = resultSharesCleaned[0][0].length

		let result = Array(numRows)
		for (let i = 0; i < result.length; i++) {
			result[i] = new Int32Array(numCols)
		}

		for (let col = 0; col < numCols; col++) {
			for (let row = 0; row < numRows; row++) {
				let ret = 0
				// decide between binary and arithmetic reconstruction based on [ or [[, respectively
				if (columnNames[col].includes("[")) {
					// binary
					console.log("binary")
					for (let share = 0; share < resultSharesCleaned.length; share++) {
						let value = resultSharesCleaned[share][row][col]
						ret ^= value
					}
				} else {
					// arithmetic
					console.log("arithmetic")
					for (let share = 0; share < resultSharesCleaned.length; share++) {
						let value = resultSharesCleaned[share][row][col]
						ret = (ret + value) % 2 ** 32
					}
				}
				result[row][col] = ret
			}
		}

		console.log("Reconstructed data:", result)

		// return both the column names and the reconstructed data
		return [columnNames, result]
	}

	function filterValidBit(columnNames, data) {
		// check if there is a valid bit and find it
		let validColumn = -1
		for (let i = 0; i < columnNames.length; i++) {
			if (columnNames[i].includes('#V')) {
				validColumn = i
				break
			}
		}
		// if no valid column, I don't think this should ever happen
		if (validColumn == -1) {
			return data
		}

		let filteredRows = []
		for (let row = 0; row < data.length; row++) {
			if (data[row][validColumn] == 1) {
				let newRow = new Int32Array(columnNames.length - 1)
				let index = 0
				for (let i = 0; i < columnNames.length; i++) {
					if (i != validColumn) {
						newRow[index] = data[row][i];
						index++;
					}
				}
				filteredRows.push(newRow)
			}
		}

		return filteredRows
	}

	function separateWageGapTables(data) {
		// separate tables
		let degreeData = []
		let yoeData = []
		let regionData = []
		let academiaData = []
		for (let row = 0; row < data.length; row++) {
			switch (data[row][2]) {
				case 1:
					degreeData.push(data[row])
					break
				case 2:
					yoeData.push(data[row])
					break
				case 4:
					regionData.push(data[row])
					break
				case 8:
					academiaData.push(data[row])
					break
			}
		}
		return [degreeData, yoeData, regionData, academiaData]
	}

	function makeBarGraph(ctx, title, labels, values) {
		let chartData = []
		for (let i = 0; i < labels.length; i++) {
			let bar = {
				label: labels[i],
				data: [values[i]]
			}
			chartData.push(bar)
		}
		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: [title],
				datasets: chartData
			},
			options: {
				scales: {
					y: {
						beginAtZero: true
					}
				}
			}
		});
	}

	function generateChartWageGap(tables, totalWageCtx, degreeWageCtx, regionWageCtx, yoeCtx) {
		let degreeData = tables[0]
		let yoeData = tables[1]
		let regionData = tables[2]
		let academiaData = tables[3]

		// ACADEMIA
		let academiaLabels = ['Wage Gap']

		let academiaWageValues = [academiaData[0][0]]
		makeBarGraph(totalWageCtx, 'Wages: Industry vs. Academia', academiaLabels, academiaWageValues)

		// DEGREE
		let degreeLabels = ['No College', 'Undergraduate', 'Graduate', 'Doctorate', 'Other']

		let degreeWageValues = [degreeData[0][0], degreeData[1][0], degreeData[2][0], degreeData[3][0], degreeData[4][0]]
		makeBarGraph(degreeWageCtx, 'Wages by Highest Degree', degreeLabels, degreeWageValues)

		// REGION
		let regionLabels = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Middle East', 'Oceania', 'Other']
		let regionWageValues = []
		for (let i = 0; i < regionData.length; i++) {
			regionWageValues.push(regionData[i][0])
		}
		makeBarGraph(regionWageCtx, 'Wages by Region', regionLabels, regionWageValues)

		// YOE
		let yoeLabels = ['0', '1-4', '5-10', '11-20', '21+']
		let yoeValues = [yoeData[0][0], yoeData[1][0], yoeData[2][0], yoeData[3][0], yoeData[4][0]]
		makeBarGraph(yoeCtx, 'Years of Experience', yoeLabels, yoeValues)
	}

	useEffect(() => {
		getAnalysis(entryId).then((a) => {
			setFormData(a);
			setSchema(a.schema);
		});

		onSnapshotResult(entryId, async (r) => {
			// TODO: r.result is a list of read-only presigned urls
			let resultSharesPresignedUrls = r.result
			console.log(`Result Shares Presigned URLs:`, resultSharesPresignedUrls);
			if (resultSharesPresignedUrls == null) {
				return
			}
			// Has result but not reconstructed yet
			setHasResult(true);

			if (Array.isArray(resultSharesPresignedUrls) && resultSharesPresignedUrls.length > 0) {
				const resultSharesList = await downloadCSVs(resultSharesPresignedUrls);
				const reconstructedDataArray = reconstructShares(resultSharesList);
				const columnNames = reconstructedDataArray[0];
				const unfilteredResult = reconstructedDataArray[1];
				const result = filterValidBit(columnNames, unfilteredResult)

				const dataArray = result.map(uintArray => Array.from(uintArray));


				let showGraph = false;
				for (let i = 0; i < columnNames.length; i++) {
					if (columnNames[i].includes('AvgSalary')) {
						// setAcademiaQuery(true);
						showGraph = true;
					}
				}

				if (showGraph == false) {
					let columnsToDisplay = []
					for (let i = 0; i < columnNames.length; i++) {
						if (columnNames[i].includes('#V')) {
							continue;
						}

						columnsToDisplay.push({
							title: columnNames[i].replace('[', '').replace(']', ''), // remove '[]'
							type: "numeric",
							width: 200
						})
					}

					// TODO: debug print: print the result secret shares
					if (!spreadsheetRef.current.jspreadsheet) {
						setSpreadsheet(
							jspreadsheet(spreadsheetRef.current, {
								allowRenameColumn: false,
								allowInsertColumn: false,
								allowDeleteColumn: false,
								data: dataArray,
								minDimensions: [1, 1],
								columns: columnsToDisplay
							})
						)
					}
				} else {
					// this is the academia query
					const totalWageCtx = totalWageCtxRef.current.getContext('2d');
					const degreeWageCtx = degreeWageCtxRef.current.getContext('2d');
					const regionWageCtx = regionWageCtxRef.current.getContext('2d');
					const yoeCtx = yoeCtxRef.current.getContext('2d');

					let separatedTables = separateWageGapTables(result)
					generateChartWageGap(separatedTables, totalWageCtx, degreeWageCtx, regionWageCtx, yoeCtx)
				}
			}
		})
	}, [entryId]);

	return (
		<>
			<h1 style={{
				textAlign: "center"
			}}>{formData.analysisName}</h1>


			<Stack className="mt-3">
				<fieldset disabled>
					<h4>Data Schema</h4>
					<Table>
						<thead>
							<tr>
								<th>Column Name</th>
								<th>Units</th>
								<th>Data Type</th>
							</tr>
						</thead>
						<tbody>
							{Object.values(schema).map((column, index) => {
								return (
									<tr
										key={`analysis-entry-${schema.id}-${index}`}
									>
										<td>{column.columnName}</td>
										<td>{column.units}</td>
										<td>
											<AnalysisDataType schemaRow={column} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</Table>

					<Row>
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
										onChange={() => { }}
									/>
								</div>
							))}
						</Col>
						<Col>
							<Form.Label>Cloud Provider</Form.Label>
							{Object.keys(CLOUD_PROVIDERS).map((providerType) => (
								<div
									key={`cloud-provider-${CLOUD_PROVIDERS[providerType]}`}
									className="mb-3"
								>
									<Form.Check
										id={`provider-type-${CLOUD_PROVIDERS[providerType]}`}
										type="switch"
										label={CLOUD_PROVIDERS[providerType]}
										checked={
											formData.cloudProviders[
											CLOUD_PROVIDERS[providerType]
											]
										}
										onChange={() => { }}
									/>
								</div>
							))}
						</Col>
					</Row>

					<h4>Query</h4>
					{formData.inputQuery && formData.inputQuery.length > 0 && (
						<div>
							<div className={style.containerStyle}>
								<pre className={style.codeStyle}>
									{formData.inputQuery}
								</pre>
							</div>
							<br />
						</div>
					)}
					<h4>Description</h4>
					<p>{formData.analysisDesc || "N/A"}</p>


				</fieldset>
			</Stack>

			<h4>Analysis Results</h4>
			{
				!hasResult && spreadsheet == null && (<h4
					style={{
						color: 'green'
					}}
				>
					Pending
				</h4>)}

			{
				hasResult && spreadsheet == null && academiaQuery == false && (<h4
					style={{
						color: 'blue'
					}}
				>
					Visualizing Results
				</h4>)}

			{academiaQuery && <div style={{ display: "flex", flexWrap: "wrap", width: 1220, justifyContent: "space-around", }}>
				<div style={{ width: 600, height: 300, border: "2px solid", margin: "10px", flex: "1 1 0", }}><canvas ref={totalWageCtxRef}></canvas></div>
				<div style={{ width: 600, height: 300, border: "2px solid", margin: "10px", flex: "1 1 0", }}><canvas ref={degreeWageCtxRef}></canvas></div>
				<div style={{ width: 600, height: 300, border: "2px solid", margin: "10px", flex: "1 1 0", }}><canvas ref={regionWageCtxRef}></canvas ></div>
				<div style={{ width: 600, height: 300, border: "2px solid", margin: "10px", flex: "1 1 0", }}><canvas ref={yoeCtxRef}></canvas ></div>
			</div>}

			<div
				style={{
					"overflowX": "auto",
					"maxWidth": "500px",
					"maxHeight": "200px"
				}}
			>
				<div ref={spreadsheetRef}></div>
			</div>
		</>
	);
};
export default DataAnalysisEntry;

/*
<div style={{ width: 400, height: 200, border: "2px solid", margin: "10px", flex: "1 1 0", }}><canvas ref={academiaYoeCtxRef}></canvas></div>
<div style={{ width: 400, height: 200, border: "2px solid", margin: "10px", flex: "1 1 0", }}><canvas ref={degreeYoeCtxRef}></canvas></div>
style={{ width: "100%", height: "100%", }}
<div style={{ width: 800, height: 200, border: "2px solid", margin: "10px", }}><canvas style={{ width: "100%", height: "100%", }} ref={regionYoeCtxRef}></canvas ></div>
*/
