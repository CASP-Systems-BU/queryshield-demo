import { useState } from "react";
import { MdOutlineInfo } from "react-icons/md";
import AnalysisDetailsModal from "../AnalysisDetailsModal";
import { getAnalysis } from "../../firebase/firebase";
import {
	CLOUD_PROVIDERS,
	HONESTY_LEVEL,
	ANALYSIS_STATUS,
} from "../../constants.js";
function NotificaitonRow({ notification, sequenceNum }) {
	const [show, setShow] = useState(false);

	const [analysis, setAnalysis] = useState({
		analysisName: "",
		inputQuery: "",
		analysisDesc: "",
		serverHonestyLevel: HONESTY_LEVEL.HONEST,
		cloudProviders: {
			[CLOUD_PROVIDERS.AWS]: true,
			[CLOUD_PROVIDERS.GOOGLE_CLOUD]: false,
			[CLOUD_PROVIDERS.AZURE]: false,
		},
		schema: [
			{
				columnName: null,
				units: null,
				dataType: null,
				varCharUnits: null,
			},
		],
		status: ANALYSIS_STATUS.CREATED,
		ownersRegistered: [],
	});
	const handleClose = () => setShow(false);
	const handleShow = async () => {
		const a = await getAnalysis(notification.analysisEntryId);
		setAnalysis(a);
		setShow(true);
	};

    const notifMessage = () => {
    if([
        ANALYSIS_STATUS.SUBMITTED,
    ].includes(notification.notificationMessage)){
        return "Started Analysis"
    } else if(![
        ANALYSIS_STATUS.SUBMITTED,
        ANALYSIS_STATUS.CREATING_VMS,
        ANALYSIS_STATUS.VMS_CREATED,
        ANALYSIS_STATUS.SETTING_UP_AUTH,
        ANALYSIS_STATUS.FINISHED_AUTH_SETUP,
        ANALYSIS_STATUS.DEPLOYING_AGENT,
        ANALYSIS_STATUS.FINISHED_AGENT_DEPLOYMENT,
        ANALYSIS_STATUS.RUNNING_EXPERIMENT,
        ANALYSIS_STATUS.SUCCESS,
        ANALYSIS_STATUS.FAIL
    ].includes(notification.notificationMessage)
        )
        return "Finished Analysis"
        }

	return (
		<>
			<tr>
				<td>{sequenceNum + 1}</td>
				<td>{notification.analysisEntryName || "N/A"}</td>
				<td>
					{new Date(
						notification.timestamp.seconds * 1000
					).toUTCString()}
				</td>
				<td>
					{
						<span
							onClick={handleShow}
							style={{ cursor: "pointer" }}
						>
							{notifMessage()}
						</span>
}
				</td>
				<td>
					<MdOutlineInfo
						onClick={handleShow}
						style={{ cursor: "pointer" }}
					/>
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

export default NotificaitonRow;
