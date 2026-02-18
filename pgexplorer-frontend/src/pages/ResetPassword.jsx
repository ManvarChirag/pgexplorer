import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/authService";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const token = searchParams.get("token");
    if (!token) {
      setMessage("Missing reset token.");
      return;
    }

    try {
      const res = await resetPassword({ token, newPassword });
      setMessage(res.message || "Password reset successful.");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setMessage(err.response?.data?.message || "Reset failed.");
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <div className="pg-glass rounded-4 p-4 p-md-5">
          <h2 className="h4 mb-3">Reset Password</h2>
          <form onSubmit={submit} className="pg-form">
            <label className="form-label">New password</label>
            <input
              className="form-control"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button className="btn btn-primary w-100 pg-btn mt-4" type="submit">
              Reset password
            </button>
          </form>
          {message && <div className="pg-muted small mt-3">{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
