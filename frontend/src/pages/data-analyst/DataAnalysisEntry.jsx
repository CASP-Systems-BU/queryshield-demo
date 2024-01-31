import {
	ANALYSIS_STATUS,
	CLOUD_PROVIDERS,
	HONESTY_LEVEL,
} from "../../constants";
import { useParams } from "react-router-dom";
import { getAnalysis, onSnapshotResult } from "../../firebase/firebase";
import { useEffect, useState, useRef } from "react";
import AnalysisEntryDetails from "../../components/AnalysisEntryDetails";
import jspreadsheet from "jspreadsheet-ce";
import * as math from "mathjs"
import style from "../../components/style.module.css"
import { Stack, Table, Row, Col, Form } from "react-bootstrap";
import AnalysisDataType from "../../components/AnalysisDataType";


const DataAnalysisEntry = () => {
    const spreadsheetRef = useRef()
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
	useEffect(() => {
		getAnalysis(entryId).then((a) => {
			setFormData(a);
			setSchema(a.schema);
		});

        onSnapshotResult(entryId,(r)=>{
            let csvData = r.result
            console.log(csvData)
            if(csvData == null){
                return
            }

            if(r.result != ""){

            console.log(csvData)
            const lines = csvData.trim().split(";\n");

            console.log(lines)

            const matrix = math.matrix(lines.map(line => line.split(',').map(Number)));
            console.log(matrix.toArray())

            const numRows = math.size(matrix)._data[0]
            console.log(numRows)
            
            const elems = math.subset(matrix, math.index(math.range(numRows - 4, numRows), 0)).toArray();
            }

			if (!spreadsheetRef.current.jspreadsheet) {
            setSpreadsheet(
                jspreadsheet(spreadsheetRef.current,{
allowRenameColumn:false,
                        allowInsertColumn:false,
                        allowDeleteColumn:false,
                        // todo-es : pull from the CSV instead
                    data:[["4743266019282124000"],["6180262134048106000"],["7527864945403290000"],["7918301996359811000"]],
                    minDimensions:[1,4],
                    columns:[{
                        title:"UID",
                        type:"numeric",
                        width:300
                    }]
                })
            )}
        })
	}, [entryId]);

	return (
		<>
            <h1 style={{
                textAlign:"center"
            }}>{formData.analysisName}</h1>
			<h4>Analysis Results</h4>
            {
                spreadsheet == null && (<h4 
                    style={{
                        color:'green'
                    }}
                >
            Pending
                </h4>)}  

            <div 
            style={{
	"overflowX": "auto",
	"max-width": "500px",
	"max-height": "200px"
            }}
            >
                <div ref={spreadsheetRef}></div>
            </div>

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
									onChange={() => {}}
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
									onChange={() => {}}
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
		</>
	);
};
export default DataAnalysisEntry;
