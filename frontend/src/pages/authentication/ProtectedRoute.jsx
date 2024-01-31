import { useContext } from "react";
import { UserContext } from "../../App";
import { Navigate } from "react-router-dom";
const ProtectedRoute = ({ children, accessibleBy }) => {
	const userContext = useContext(UserContext);
	if (accessibleBy.includes(userContext.user.accessPermission)) {
		return <>{children}</>;
	} else {
		return <Navigate to="/" />;
	}
};
export default ProtectedRoute;
