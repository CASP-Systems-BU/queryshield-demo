import { Button, Dropdown, Modal, NavDropdown } from "react-bootstrap";
import style from "./style.module.css";
import AnalysisDataType from "./AnalysisDataType";
const AnalysisDetailsModal = ({ analysis, show, handleClose }) => {
	const tableStyles = {
		table: {
			borderCollapse: "collapse",
			width: "100%",
		},
		th: {
			border: "1px solid #dddddd",
			backgroundColor: "#f2f2f2",
			textAlign: "left",
			padding: "8px",
		},
		td: {
			border: "1px solid #dddddd",
			textAlign: "left",
			padding: "8px",
		},
	};
	return (
		<>
			<Modal show={show} onHide={handleClose}>
				<Modal.Header closeButton>
					<Modal.Title>More Details</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<p>Analysis Name: {analysis.analysisName || "N/A"}</p>
					{analysis.inputQuery && analysis.inputQuery.length > 0 && (
						<div>
							<p>Input Query:</p>
							<div className={`${style.containerStyle}`}>
								<pre className={`${style.code}`}>
									{analysis.inputQuery}
								</pre>
							</div>
						</div>
					)}
					{analysis.serverHonestyLevel && (
						<p>Threat Model: {analysis.serverHonestyLevel}</p>
					)}
					{analysis.cloud && analysis.cloud.length > 0 && (
						<p>Cloud: {analysis.cloud.join(", ")}</p>
					)}
					{analysis.ownersRegistered && (
						<p>
							Number of Registrants:{" "}
							{analysis.ownersRegistered.length}
						</p>
					)}
					<h4>Analysis Schema</h4>
					<table style={tableStyles.table}>
						<thead>
							<tr>
								<th style={tableStyles.th}>Column Name</th>
								<th style={tableStyles.th}>
									Units (e.g. USD, kg, etc.)
								</th>
								<th style={tableStyles.th}>Datatype </th>
							</tr>
						</thead>
						<tbody>
							{analysis.schema.map((schemaRow, i) => {
								return (
									<tr
										key={`${schemaRow.columnName}-${schemaRow.dataType}-${i}`}
									>
										<td style={tableStyles.td}>
											{schemaRow.columnName}
										</td>
										<td style={tableStyles.td}>
											{schemaRow.units}
										</td>
										<td style={tableStyles.td}>
											<AnalysisDataType
												schemaRow={schemaRow}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="primary" onClick={handleClose}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>
		</>
	);
};
export default AnalysisDetailsModal;
