import { useEffect, useState } from "react";
import { Stack, InputGroup, Table } from "react-bootstrap";
import { MdSearch } from "react-icons/md";
import AnalysisCatalogRow from "../../components/AnalysisCatalogRow";
import styles from "./style.module.css";
import { getAllAnalyses } from "../../firebase/firebase";
import { stringify } from "../../helper";
import useDelayedSearch from "../../hooks/useDelayedSearch";
import { ANALYSIS_STATUS } from "../../constants.js";

function AnalysisCatalogPage() {
	const [catalogData, setCatalogData] = useState([]);
	useEffect(() => {
		getAllAnalyses().then((catalog) => {
			console.log(catalog);
			setCatalogData(catalog);
		});
	}, []);

	// todo-es : make sure that no race conditions happen when data analyst starts query while
	// data owner is still uploading data
	const { stagingQuery, committedQuery, handleSearch } = useDelayedSearch();

	const filteredCatalog = catalogData.filter((analysis, index) => {
		return true;
		// In the demo, we assume there is only one analyst.
		// Instead of filtering out analyses, we show them with disabled "Share Data" button in the frontend.
		if (analysis.status != ANALYSIS_STATUS.CREATED) {
			return false
		}
		if (
			committedQuery == "" ||
			stringify(analysis).includes(committedQuery)
		) {
			return true
		} else {
			return false
		}
	})
	return (
		<>
			<Stack>
				<h1 style={{ textAlign: "center", marginTop: "1.3rem" }}>Analysis Catalog</h1>

				<div className={`${styles.search}`}>
					<InputGroup>
						<MdSearch style={{ fontSize: "2rem" }} />
						<input
							type="text"
							placeholder="Search"
							value={stagingQuery}
							onChange={handleSearch}
							className={`form-control ${styles.inputBox}`}
						/>
					</InputGroup>
				</div>

				<Table striped bordered hover style={{ width: "100%" }}>
					<thead>
						<tr>
							<th>#</th>
							<th>Analysis Name</th>
							<th>Description</th>
							<th>More Details</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{filteredCatalog.map((analysis, index) => {
							return <AnalysisCatalogRow
								analysis={analysis}
								sequenceNum={index}
								key={`${index}`}
							/>
						})}
					</tbody>
				</Table>
			</Stack>
		</>
	);
}

export default AnalysisCatalogPage;
