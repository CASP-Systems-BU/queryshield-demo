import { Table, Container } from "react-bootstrap";
import { getAllAnalyses } from "../../firebase/firebase";
import { useEffect, useState } from "react";
import AdminHistoryRow from "../../components/AdminHistoryRow";

const AdminHistoryPage = () => {
	const [analyses, setAnalyses] = useState([]);
	useEffect(() => {
		getAllAnalyses().then((catalog) => setAnalyses(catalog));
	}, []);
	return (
		<Container>
			<h1 style={{
                textAlign:"center"
            }}>Analysis History</h1>
			<Table
				style={{
					margin: "1rem 0",
					width: "95%",
				}}
				responsive
			>
				<thead>
					<tr>
						<th>Status</th>
						<th>Name</th>
						<th>Owners Registered</th>
						<th>Action</th>
					</tr>
				</thead>
				<tbody>
					{analyses.map((analysis) => {
						return (
							<AdminHistoryRow
								key={analysis.id}
								status={analysis.status}
								jobId={analysis.jobId}
								documentId={analysis.id}
								name={analysis.analysisName}
								ownersRegistered={analysis.ownersRegistered}
							/>
						);
					})}
				</tbody>
			</Table>
		</Container>
	);
};
export default AdminHistoryPage;
