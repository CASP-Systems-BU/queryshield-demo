import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Container, Row, Col, Stack } from "react-bootstrap";
import SidebarLayout from "./components/Layout/Sidebar";
import TopNavBar from "./components/Navbar";
import "./App.css";
import AnalysisCatalogPage from "./pages/data-owners/AnalysisCatalogPage";
import NotificationsPage from "./pages/data-owners/NotificationsPage";
import CreateAnalysisPage from "./pages/data-analyst/CreateAnalysisPage";
import AnalystHistoryPage from "./pages/data-analyst/AnalystHistoryPage";
import AdminHistoryPage from "./pages/admin/AdminHistoryPage.jsx";
import DataAnalysisEntry from "./pages/data-analyst/DataAnalysisEntry";
import { createContext, useEffect, useState, useLayoutEffect } from "react";
import ProtectedRoute from "./pages/authentication/ProtectedRoute";
import { ACCESS_PERMISSION_ROLES } from "./constants.js";
import { getUser } from "./firebase/firebase";
import Cookie from "js-cookie";
import SignupPageEmail from "./pages/authentication/SignupPageEmail";
import LoginPageEmail from "./pages/authentication/LoginPageEmail";
import UploadDataPage from "./pages/data-owners/UploadDataPage";
import DummyTest from "./Test";
export const UserContext = createContext({
	user: {
		userId: "this is a userid 1",
		isLoggedIn: false,
		accessPermission: null,
	},
	setUser: () => {},
});
function App() {
	const [user, setUser] = useState({
		userId: "this is user id 2",
		isLoggedIn: false,
		accessPermission: null,
	});

	const [loading, setLoading] = useState(true);
	useEffect(() => {
		/*
		const auth = getAuth();
		auth.onAuthStateChanged(() => {
			if (auth.currentUser) {
				getUser(auth.currentUser.uid).then((user) => {
					setUser({
						isLoggedIn: true,
						accessPermission: user.accessPermission,
						userId: auth.currentUser.uid,
					});
				});
			}
		});
        */
		const userId = Cookie.get("userId");
		if (userId) {
			getUser(userId).then((user) => {
				setUser({
					isLoggedIn: true,
					accessPermission: user.accessPermission,
					userId: userId,
				});
				setLoading(false);
			});
		} else {
			setLoading(false);
		}
	}, []);

	const value = {
		user,
		setUser,
	};

	const [isMobile, setIsMobile] = useState(window.outerWidth < 768);

	useLayoutEffect(() => {
		function updateSize() {
			setIsMobile(window.innerWidth < 768);
		}
		window.addEventListener("resize", updateSize);
		updateSize();
		return () => window.removeEventListener("resize", updateSize);
	}, []);

	return (
		!loading && (
			<UserContext.Provider value={value}>
				<Router>
					<Container fluid style={{ padding: "0px" }}>
						{isMobile ? (
							<TopNavBar className="top-nav-bar" />
						) : (
							<SidebarLayout />
						)}
						<Stack direction={isMobile ? "vertical" : "horizontal"}>
							<div
								style={{
									width: isMobile ? "1px" : "24vw",
									height: isMobile ? "8vh" : "1px",
								}}
							></div>
							<Container
								style={{
									marginTop: "2vw",
									marginLeft: "2vh",
									width: "100%",

									marginRight: "0px",
								}}
							>
								<Routes>
									<Route
										path="/analysis-catalog"
										element={
											<ProtectedRoute
												accessibleBy={[
													ACCESS_PERMISSION_ROLES.DATA_OWNER,
												]}
											>
												<AnalysisCatalogPage />
											</ProtectedRoute>
										}
									/>
									<Route
										path="/notifications"
										element={
											<ProtectedRoute
												accessibleBy={[
													ACCESS_PERMISSION_ROLES.DATA_OWNER,
												]}
											>
												<NotificationsPage />
											</ProtectedRoute>
										}
									/>
									<Route
										path="/create-analysis"
										element={
											<ProtectedRoute
												accessibleBy={[
													ACCESS_PERMISSION_ROLES.DATA_ANALYST,
												]}
											>
												<CreateAnalysisPage />
											</ProtectedRoute>
										}
									/>
									<Route
										path="/analysis-history"
										element={
											<ProtectedRoute
												accessibleBy={[
													ACCESS_PERMISSION_ROLES.DATA_ANALYST,
												]}
											>
												<AnalystHistoryPage />
											</ProtectedRoute>
										}
									/>
									<Route
										path="/admin/analysis-history"
										element={
											<ProtectedRoute
												accessibleBy={[
													ACCESS_PERMISSION_ROLES.ADMIN,
												]}
											>
												<AdminHistoryPage />
											</ProtectedRoute>
										}
									/>
									<Route
										path="/entry/:entryId"
										element={
											<ProtectedRoute
												accessibleBy={[
													ACCESS_PERMISSION_ROLES.DATA_ANALYST,
													ACCESS_PERMISSION_ROLES.ADMIN,
												]}
											>
												<DataAnalysisEntry />
											</ProtectedRoute>
										}
									/>
									<Route
										path="/upload/:entryId"
										element={

											<ProtectedRoute
												accessibleBy={[
													ACCESS_PERMISSION_ROLES.DATA_OWNER,
												]}
											>

												<UploadDataPage />
											</ProtectedRoute>
										}
									/>
									<Route
										path="/signup"
										element={<LoginPageEmail />}
									/>
									<Route
										path="/signup-email"
										element={<SignupPageEmail/>}
									/>
									<Route
										path="/login-email"
										element={<LoginPageEmail />}
									/>
									<Route
										path="/dummy-path"
										element={<DummyTest />}
									/>
									<Route
										path="/"
										element={<LoginPageEmail />}
									/>
								</Routes>
							</Container>
						</Stack>
					</Container>
				</Router>
			</UserContext.Provider>
		)
	);
}

export default App;
