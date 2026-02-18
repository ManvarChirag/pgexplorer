import { useState } from "react";
import { forgotPassword } from "../services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await forgotPassword(email);
      setMessage(res.message || "If the email exists, a reset link was sent.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Request failed.");
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <div className="pg-glass rounded-4 p-4 p-md-5">
          <h2 className="h4 mb-3">Forgot Password</h2>
          <form onSubmit={submit} className="pg-form">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn btn-primary w-100 pg-btn mt-4" type="submit">
              Send reset link
            </button>
          </form>
          {message && <div className="pg-muted small mt-3">{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
