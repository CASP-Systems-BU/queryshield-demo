import { useContext } from "react";
import { Container, Button } from "react-bootstrap";
import { UserContext } from "../../App";
import { ACCESS_PERMISSION_ROLES } from "../../constants";
import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import Cookie from "js-cookie";
const LoginPage = () => {
	const navigate = useNavigate();
	const userContext = useContext(UserContext);
	const loginAsDataOwner = () => {
		Cookie.set("userId", "PvCSfL0BOrZbsRZ7NR5tPh8FavH3");
		userContext.setUser({
			userId: "PvCSfL0BOrZbsRZ7NR5tPh8FavH3",
			isLoggedIn: true,
			accessPermission: ACCESS_PERMISSION_ROLES.DATA_OWNER,
		});
		navigate("/analysis-catalog");
	};
	const loginAsDataAnalyst = () => {
		Cookie.set("userId", "49VTHF5GKBc0lKhczIM41DeirNI2");
		userContext.setUser({
			userId: "49VTHF5GKBc0lKhczIM41DeirNI2",
			isLoggedIn: true,
			accessPermission: ACCESS_PERMISSION_ROLES.DATA_ANALYST,
		});
		navigate("/create-analysis");
	};
	return (
		<Container className={`${styles.outterContainer}`}>
			<Container className={`${styles.centeredContainer}`}>
				<Button onClick={loginAsDataOwner}>Login as Data Owner</Button>
				<br />
				<Button onClick={loginAsDataAnalyst}>
					Login as Data Analyst
				</Button>
			</Container>
		</Container>
	);
};
export default LoginPage;
