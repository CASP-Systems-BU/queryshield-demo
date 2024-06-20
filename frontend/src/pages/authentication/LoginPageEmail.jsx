import { useState, useContext } from "react";
import { Container, Button, Form } from "react-bootstrap";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import { getUser } from "../../firebase/firebase";
import { UserContext } from "../../App";
import { ACCESS_PERMISSION_ROLES } from "../../constants.js";
import Cookies from "js-cookie";

const LoginPageEmail = () => {
	// todo-es : fix safari/chrome layout issues with the "Login" button

	const userContext = useContext(UserContext);
	const navigate = useNavigate();
	const auth = getAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loginError, setLoginError] = useState({
		hasError: false,
		statusMessage: "",
	});

	const loginWithEmailAndPassword = async () => {
		try {
			const user = await signInWithEmailAndPassword(
				auth,
				email,
				password
			);
			const userId = user.user.uid;
			const firebaseUser = await getUser(userId);
			const accessPermission = firebaseUser.accessPermission;
			Cookies.set("userId", userId);
			userContext.setUser({
				userId,
				isLoggedIn: true,
				accessPermission,
			});
			if (accessPermission == ACCESS_PERMISSION_ROLES.DATA_ANALYST) {
				navigate("/create-analysis");
			} else if (accessPermission == ACCESS_PERMISSION_ROLES.ADMIN) {
				navigate("/admin/analysis-history")
			} else {
				navigate("/analysis-catalog");
			}
		} catch (error) {
			console.error("Error:", error.message);
			setLoginError({
				hasError: true,
				statusMessage: error.message,
			});
		}
	};

	return (
		<Container className={`${styles.outterContainer}`}>
			<Container className={`${styles.centeredContainer}`}>
				<h3 className="mb-4 mx-auto">Login</h3>
				<Form className={`${styles.formContainer}`}>
					<Form.Group className={`${styles.formGroup} mb-3`}>
						<Form.Label>Email address</Form.Label>
						<Form.Control
							type="email"
							placeholder="Enter email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</Form.Group>
					<Form.Group className={`${styles.formGroup} mb-3`}>
						<Form.Label>Password</Form.Label>
						<Form.Control
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</Form.Group>
					{loginError.hasError && (
						<p style={{ color: "red" }}>
							{loginError.statusMessage}
						</p>
					)}
					<Button onClick={loginWithEmailAndPassword}>Login</Button>
					<div
						style={{
							background: "#dee2e6",
							width: "100%",
							height: "1px",
							marginTop: "15px",
							marginBottom: "10px",
						}}
					></div>
					<Container style={{ textAlign: "center" }}>
						<p>{"Don't have an account?"}</p>
						<Button onClick={() => navigate("/signup-email")}>
							Sign Up
						</Button>
					</Container>
				</Form>
			</Container>
		</Container>
	);
};

export default LoginPageEmail;
