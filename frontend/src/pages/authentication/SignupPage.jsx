import { Container, Button, Form } from "react-bootstrap";
import {
	getAuth,
	signInWithPopup,
	GoogleAuthProvider,
	setPersistence,
	browserSessionPersistence,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useState, useContext } from "react";
import { createUser, getUser } from "../../firebase/firebase";
import { UserContext } from "../../App";
import { ACCESS_PERMISSION_ROLES } from "../../constants";
import styles from "./style.module.css";

const SignupPage = () => {
	const userContext = useContext(UserContext);
	const navigate = useNavigate();
	const auth = getAuth();

	const provider = new GoogleAuthProvider();

	const googleSignIn = async () => {
		await setPersistence(auth, browserSessionPersistence);
		try {
			const result = await signInWithPopup(auth, provider);
			const user = result.user;

			return user.uid;
		} catch (error) {
			console.log("Error:", error);
			return null;
		}
	};

	const [isDataOwner, setIsDataOwner] = useState(true);
	const [signUpError, setSignUpError] = useState({
		hasError: false,
		statusMessage: null,
	});
	const signUp = async () => {
		const userId = await googleSignIn();
		if (userId == null) {
			setSignUpError({
				hasError: true,
				statusMessage: "Failed to Sign In With Google",
			});
			return;
		}
		const user = await getUser(userId);
		if (user != null) {
			setSignUpError({
				hasError: true,
				statusMessage: "Already signed-Up; Please sign-In instead",
			});
			return;
		}
		setSignUpError({
			hasError: false,
			statusMessage: null,
		});
		await createUser({
			userId,
			accessPermission: isDataOwner
				? ACCESS_PERMISSION_ROLES.DATA_OWNER
				: ACCESS_PERMISSION_ROLES.DATA_ANALYST,
		});
		userContext.setUser({
			isLoggedIn: true,
			userId,
			accessPermission: isDataOwner
				? ACCESS_PERMISSION_ROLES.DATA_OWNER
				: ACCESS_PERMISSION_ROLES.DATA_ANALYST,
		});
		if (isDataOwner) {
			navigate("/analysis-catalog");
		} else {
			navigate("/create-analysis");
		}
	};
	const signIn = async () => {
		const userId = await googleSignIn();
		const user = await getUser(userId);
		if (user == null) {
			setSignUpError({
				hasError: true,
				statusMessage: "User has not signed-up yet",
			});
			return;
		}
		userContext.setUser({
			isLoggedIn: true,
			userId,
			accessPermission: user.accessPermission,
		});
		if (
			userContext.user.accessPermission ==
			ACCESS_PERMISSION_ROLES.DATA_OWNER
		) {
			navigate("/analysis-catalog");
		} else {
			navigate("/create-analysis");
		}
	};

	return (
		<Container className={`${styles.outterContainer}`}>
			<div className={`${styles.welcomeContainer} border mx-auto`}>
				<h3 className="mb-4 mx-auto">Welcome</h3>
				<Container className={`${styles.signupContainer} mb-2`}>
					<Form>
						<Form.Group className={`${styles.checkboxContainer} mb-3`}>
							<Form.Check
								className="me-4"
								checked={isDataOwner == false}
								id={`data-analyst-radio`}
								type="radio"
								label="Data Owner"
								onChange={(e) => {
									setIsDataOwner(false);
								}}
							/>
							<Form.Check
								checked={isDataOwner == true}
								id={`data-owner-radio`}
								type="radio"
								label="Data Analyst"
								onChange={(e) => {
									setIsDataOwner(true);
								}}
							/>
						</Form.Group>
					</Form>
					{signUpError.hasError && (
						<p style={{ color: "red" }}>{signUpError.statusMessage}</p>
					)}
					<Button onClick={signUp} className="mx-auto">Sign Up With Google</Button>
				</Container>
				<hr />
				<Container className={`${styles.centeredContainer}`}>
					<p>Already Signed Up?</p>
					<Button onClick={signIn}>Sign In With Google</Button>
				</Container>
			</div>
		</Container>
	);
};

export default SignupPage;
