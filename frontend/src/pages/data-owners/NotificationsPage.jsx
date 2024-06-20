import { useState, useEffect, useContext } from "react";
import { Stack, InputGroup, Table } from "react-bootstrap";
import { MdSearch } from "react-icons/md";
import styles from "./style.module.css";
import NotificaitonRow from "../../components/NotificationRow";
import { onSnapshot } from "firebase/firestore";
import { getAllNotificationsSnapshot } from "../../firebase/firebase";
import { UserContext } from "../../App";
import useDelayedSearch from "../../hooks/useDelayedSearch";
import { stringify } from "../../helper";
import { ANALYSIS_STATUS } from "../../constants";

function NotificationsPage() {
	const userContext = useContext(UserContext);

	const { stagingQuery, committedQuery, handleSearch } = useDelayedSearch();
	const [notifications, setNotifications] = useState([]);

    const notificationsMap = notifications.filter((notification)=>{
       return (
								(committedQuery == "" ||
									stringify(notification).includes(
										committedQuery
									)) &&
								!notification.isRead && notification.notificationMessage == ANALYSIS_STATUS.SUBMITTED || (![
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
    ].includes(notification.notificationMessage))
							) 
    })

	useEffect(() => {
		const q = getAllNotificationsSnapshot(userContext.user.userId);
		onSnapshot(q, (querySnapshot) => {
			if (querySnapshot.size > 0) {
				const temp = [];
				querySnapshot.forEach((doc) => {
					temp.push(doc.data());
				});
				temp.sort((a, b) => {
					return b.timestamp.seconds - a.timestamp.seconds;
				});
				setNotifications(temp);
			}
		});
	}, []);

	return (
		<>
			<Stack>
				<h1 style={{ 
                    
                    textAlign:'center',
                    marginTop: "1.3rem" }}>Notifications</h1>

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

				<Table striped bordered hover style={{ width: "98%" }}>
					<thead>
						<tr>
							<th>#</th>
							<th>Analysis Name</th>
							<th>Date Created</th>
							<th>Content</th>
							<th>More Details</th>
						</tr>
					</thead>
					<tbody>
						{notificationsMap.map((notification, index) => {
							 
								return (
									<NotificaitonRow
										key={`notification-${index}`}
										notification={notification}
										sequenceNum={index}
									/>
								);
							
						})}
					</tbody>
				</Table>
			</Stack>
		</>
	);
}

export default NotificationsPage;
