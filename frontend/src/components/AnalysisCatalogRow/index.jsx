import { useState, useContext, useEffect } from "react";
import { Button } from "react-bootstrap";
import { MdOutlineInfo } from "react-icons/md";
import { UserContext } from "../../App";
import AnalysisDetailsModal from "../AnalysisDetailsModal";
import { useNavigate } from "react-router-dom";

function AnalysisCatalogRow({ analysis, sequenceNum }) {
	const [show, setShow] = useState(false);
	const navigate = useNavigate();
	const handleClose = () => setShow(false);
	const handleShow = () => setShow(true);
	const userContext = useContext(UserContext);

    const REGISTRATION_STATUS = {
        UPLOADED:"UPLOADED",
        OPEN:"OPEN"
    }

	const [analysisStatus, setAnalysisStatus] = useState(REGISTRATION_STATUS.UPLOADED);
	useEffect(() => {
        if (
			analysis.ownersRegistered.indexOf(userContext.user.userId) != -1
		) {
			setAnalysisStatus(REGISTRATION_STATUS.UPLOADED);
		} else {
			setAnalysisStatus(REGISTRATION_STATUS.OPEN);
		}

	}, []);

	const handleUploadData = () => {
		navigate("/upload/" + analysis.id);
	};

	return (
		<>
			<tr
            >
				<td>{sequenceNum + 1}</td>
				<td
                style={{
                    width:"250px"
                }}
                ><div
                style={{
                    width:"fit-content"
                }}
                >
                    {analysis.analysisName || "N/A"}
                    </div>
                </td>
				<td
                style={{
                    width:"40%"
                }}
                ><div
                
            style={{
                    maxHeight:"100px",
                    overflowY:"auto"
                }}
                >
                    {analysis.analysisDesc || "N/A"}
                    </div></td>
				<td
                style={{
                    width:"150px"
                }}
                >

					<MdOutlineInfo
						onClick={handleShow}
						style={{ cursor: "pointer" }}
					/>
				</td>
				<td
                >
					{(() => {
						switch (analysisStatus) {
							case REGISTRATION_STATUS.OPEN:
								return (
									<Button
										variant="success"
										onClick={handleUploadData}
									>
                                        Share Data
									</Button>
								);
							case REGISTRATION_STATUS.UPLOADED:
								return (
									<Button variant="warning">Shared</Button>
								);
							default:
								return (
									<Button variant="danger">Completed</Button>
								);
						}
					})()}
				</td>
			</tr>

			<AnalysisDetailsModal
				analysis={analysis}
				show={show}
				handleClose={handleClose}
			/>
		</>
	);
}

export default AnalysisCatalogRow;
