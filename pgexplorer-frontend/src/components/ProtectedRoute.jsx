import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" />;

  if (role) {
    const currentRole = localStorage.getItem("role");
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(currentRole)) {
      return <Navigate to="/" />;
    }
  }

  return children;
};

export default ProtectedRoute;
