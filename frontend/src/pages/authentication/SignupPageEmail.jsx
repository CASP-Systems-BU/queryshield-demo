import { useState, useContext } from "react";
import { Container, Button, Form } from "react-bootstrap";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import { UserContext } from "../../App";
import { ACCESS_PERMISSION_ROLES } from "../../constants.js";
import Cookies from "js-cookie";
import { createUser } from "../../firebase/firebase";

const SignupPageEmail = () => {
	const userContext = useContext(UserContext);
	const navigate = useNavigate();
	const auth = getAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isDataOwner, setIsDataOwner] = useState(true);
	const [signUpError, setSignUpError] = useState({
		hasError: false,
		statusMessage: null,
	});

	const signUpWithEmailAndPassword = async () => {
		try {
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				email,
				password
			);
			const user = userCredential.user;
			const userId = user.uid;

			await createUser({
				userId,
				accessPermission: isDataOwner
					? ACCESS_PERMISSION_ROLES.DATA_OWNER
					: ACCESS_PERMISSION_ROLES.DATA_ANALYST,
			});

			Cookies.set("userId", userId);

			userContext.setUser({
				isLoggedIn: true,
				userId,
				accessPermission: isDataOwner
					? ACCESS_PERMISSION_ROLES.DATA_OWNER
					: ACCESS_PERMISSION_ROLES.DATA_ANALYST,
			});
			// Redirect to the desired page after successful signup
			if (isDataOwner) {
				navigate("/analysis-catalog");
			} else {
				navigate("/create-analysis");
			}
		} catch (error) {
			console.error("Error:", error.message);
			setSignUpError({
				hasError: true,
				statusMessage: error.message,
			});
		}
	};

	return (
		<Container className={`${styles.outterContainer}`}>
			<div className={`${styles.welcomeContainer} border mx-auto`}>
				<h3 className="mb-4 mx-auto">Sign Up</h3>
				<Container className={`${styles.signupContainer} mb-2`}>
					<Form>
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

						<Form.Group
							className={`${styles.checkboxContainer} mb-3`}
						>
							<Form.Check
								className="me-4"
								checked={isDataOwner === false}
								id={`data-analyst-radio`}
								type="radio"
								label="Data Analyst"
								onChange={() => setIsDataOwner(false)}
							/>
							<Form.Check
								checked={isDataOwner === true}
								id={`data-owner-radio`}
								type="radio"
								label="Data Owner"
								onChange={() => setIsDataOwner(true)}
							/>
						</Form.Group>

						{signUpError.hasError && (
							<p style={{ color: "red" }}>
								{signUpError.statusMessage}
							</p>
						)}

						<Button
							onClick={signUpWithEmailAndPassword}
							className={`${styles.centeredContainer}`}
						>
							Sign Up
						</Button>
					</Form>
				</Container>
				<hr />
				<Container className={`${styles.centeredContainer}`}>
					<p>Already have an account?</p>
					<Button onClick={() => navigate("/login-email")}>
						Sign In
					</Button>
				</Container>
			</div>
		</Container>
	);
};

export default SignupPageEmail;
