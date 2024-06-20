import { Stack, Row, Col, Form, Table } from "react-bootstrap";
import { CLOUD_PROVIDERS, HONESTY_LEVEL } from "../constants.js";
import style from "./style.module.css";
import AnalysisDataType from "./AnalysisDataType";
const AnalysisEntryDetails = ({ formData, schema }) => {
	return (
		<Stack className="mt-3">
			<fieldset disabled>
				<h3>Data Schema</h3>
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
					<h3>Threat Model</h3>
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

				<h4>Analysis Name</h4>
				<p>{formData.analysisName}</p>
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
	);
};
export default AnalysisEntryDetails;
