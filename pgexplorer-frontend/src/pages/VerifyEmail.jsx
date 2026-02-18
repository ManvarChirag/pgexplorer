import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyEmail } from "../services/authService";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("Missing verification token.");
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus("Email verified. You can login now.");
        setTimeout(() => navigate("/login"), 800);
      })
      .catch((err) => {
        setStatus(err.response?.data?.message || "Verification failed.");
      });
  }, [searchParams, navigate]);

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <h2 className="h4 mb-2">Verify Email</h2>
      <div className="pg-muted">{status}</div>
    </div>
  );
};

export default VerifyEmail;
