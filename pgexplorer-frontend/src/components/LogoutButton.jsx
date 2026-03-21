import { useNavigate } from "react-router-dom";
import { logout as apiLogout } from "../services/authService";

const LogoutButton = () => {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    } finally {
      navigate("/login");
    }
  };

  return (
    <button className="btn btn-outline-light pg-btn" onClick={logout}>
      Logout
    </button>
  );
};

export default LogoutButton;
