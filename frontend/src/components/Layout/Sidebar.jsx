import { Nav, NavItem, Button, Container } from "react-bootstrap";
import { BsTable } from "react-icons/bs";
import { MdOutlineEmail, MdCreate, MdAnalytics, MdLogin } from "react-icons/md";
import { GoSignOut } from "react-icons/go";
import styles from "./style.module.css";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../App";
import { ACCESS_PERMISSION_ROLES } from "../../constants.js";
import { useContext } from "react";
import Cookie from "js-cookie";

function SidebarLayout() {
	const userContext = useContext(UserContext);
	const auth = getAuth();
	const navigate = useNavigate();
	const handleSignOut = async () => {
		try {
			Cookie.remove("userId");
			await signOut(auth);
			userContext.setUser({
				userId: null,
				isLoggedIn: false,
				accessPermission: null,
			});
			navigate("/signup");
		} catch (error) {
			console.log("Error:", error);
		}
	};
	return (
		<div className={`${styles.sidebar}`}>
			{/* Title */}
			<h3 className="text-center">QueryShield</h3>

			{/* Links */}
			<Nav className="flex-column">
				{userContext.user.accessPermission ==
					ACCESS_PERMISSION_ROLES.DATA_OWNER && (
					<>
						<NavItem className={`${styles.navItem}`}>
							<BsTable />
							<Nav.Link
								onClick={() => {
									navigate("/analysis-catalog");
								}}
							>
								Analysis Catalog
							</Nav.Link>
						</NavItem>
						<NavItem className={`${styles.navItem}`}>
							<MdOutlineEmail style={{ fontSize: "18px" }} />
							<Nav.Link
								onClick={() => {
									navigate("/notifications");
								}}
							>
								Notifications
							</Nav.Link>
						</NavItem>
					</>
				)}
				{userContext.user.accessPermission ==
					ACCESS_PERMISSION_ROLES.DATA_ANALYST && (
					<>
						<NavItem className={`${styles.navItem}`}>
							<MdCreate style={{ fontSize: "18px" }} />
							<Nav.Link
								onClick={() => {
									navigate("/create-analysis");
								}}
							>
								Create Analysis
							</Nav.Link>
						</NavItem>
						<NavItem className={`${styles.navItem}`}>
							<MdAnalytics style={{ fontSize: "18px" }} />
							<Nav.Link
								onClick={() => {
									navigate("/analysis-history");
								}}
							>
								Analysis History
							</Nav.Link>
						</NavItem>
					</>
				)}
				{!userContext.user.isLoggedIn && (
					<NavItem className={`${styles.navItem}`}>
						<MdLogin style={{ fontSize: "18px" }} />
						<Nav.Link
							onClick={() => {
								navigate("/signup");
							}}
						>
							Login
						</Nav.Link>
					</NavItem>
				)}
			</Nav>

			{userContext.user.isLoggedIn && (
				<div className={`${styles.signout}`}>
					<GoSignOut className={`${styles.signoutIcon}`} />
					<Button onClick={handleSignOut} variant="outline-success">
						Sign Out
					</Button>
				</div>
			)}
		</div>
	);
}

export default SidebarLayout;
