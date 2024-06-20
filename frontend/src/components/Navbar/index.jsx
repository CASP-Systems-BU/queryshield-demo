import { useState, useContext } from "react";
import { Dropdown } from "react-bootstrap";
import styles from "./style.module.css";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../App";
import { ACCESS_PERMISSION_ROLES } from "../../constants.js";

const TopNavBar = () => {
	const [isOpen, setIsOpen] = useState(false);

	const toggleDropdown = () => setIsOpen(!isOpen);

	const userContext = useContext(UserContext);
	const auth = getAuth();
	const navigate = useNavigate();
	const handleSignOut = async () => {
		try {
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
		<div className={`${styles.navbar}`}>
			<h2>QueryShield</h2>
			<Dropdown show={isOpen} onToggle={toggleDropdown}>
				<Dropdown.Toggle variant="success" id="dropdown-basic">
					Menu
				</Dropdown.Toggle>

				<Dropdown.Menu className={`${styles.dropdownMenu}`}>
					{userContext.user.accessPermission ==
						ACCESS_PERMISSION_ROLES.DATA_OWNER && (
						<>
							<Dropdown.Item
								className={`${styles.navItem}`}
								onClick={() => {
									navigate("/analysis-catalog");
								}}
							>
								Analysis Catalog
							</Dropdown.Item>
							<Dropdown.Item
								className={`${styles.navItem}`}
								onClick={() => {
									navigate("/notifications");
								}}
							>
								Notifications
							</Dropdown.Item>
						</>
					)}
					{userContext.user.accessPermission ==
						ACCESS_PERMISSION_ROLES.DATA_ANALYST && (
						<>
							<Dropdown.Item
								className={`${styles.navItem}`}
								onClick={() => {
									navigate("/create-analysis");
								}}
							>
								Create Analysis
							</Dropdown.Item>
							<Dropdown.Item
								className={`${styles.navItem}`}
								onClick={() => {
									navigate("/analysis-history");
								}}
							>
								Analysis History
							</Dropdown.Item>
						</>
					)}
					{!userContext.user.isLoggedIn && (
						<Dropdown.Item
							className={`${styles.navItem}`}
							onClick={() => {
								navigate("/signup");
							}}
						>
							Sign-Up/Sign-In
						</Dropdown.Item>
					)}

					{userContext.user.isLoggedIn && (
						<div className={`${styles.signout}`}>
							<Dropdown.Item onClick={handleSignOut}>
								Sign Out
							</Dropdown.Item>
						</div>
					)}
				</Dropdown.Menu>
			</Dropdown>
		</div>
	);
};

export default TopNavBar;
