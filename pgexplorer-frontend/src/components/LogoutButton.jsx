import { useNavigate } from "react-router-dom";

const LogoutButton = () => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <button className="btn btn-outline-light pg-btn" onClick={logout}>
      Logout
    </button>
  );
};

export default LogoutButton;
