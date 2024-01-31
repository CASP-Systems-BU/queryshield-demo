import { Table, Container } from "react-bootstrap";
import { getMyAnalyses } from "../../firebase/firebase";
import { useEffect, useState, useContext } from "react";
import AnalystHistoryRow from "../../components/AnalystHistoryRow";
import { onSnapshot } from "firebase/firestore";
import { UserContext } from "../../App";

const AnalystHistoryPage = () => {
	const userContext = useContext(UserContext);
	const [analyses, setAnalyses] = useState([]);
	useEffect(() => {
		const q = getMyAnalyses(userContext.user.userId);
		onSnapshot(q, (querySnapshot) => {
			if (querySnapshot.size > 0) {
				const temp = [];
				querySnapshot.forEach((doc) => {
					temp.push({ id: doc.id, ...doc.data() });
				});
				setAnalyses(temp);
			}
		});
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
							<AnalystHistoryRow
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
export default AnalystHistoryPage;
