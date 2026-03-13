import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  resendVerificationEmail,
  verifyEmail,
  verifyEmailOtp,
} from "../services/authService";
import { useToast } from "../components/ToastProvider";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const token = searchParams.get("token");
  const initialEmail = searchParams.get("email") || "";

  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ email: initialEmail, otp: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Legacy link support: /verify-email?token=...
    if (!token) return;

    setStatus("Verifying...");
    verifyEmail(token)
      .then(() => {
        setStatus("Email verified. You can login now.");
        setTimeout(() => navigate("/login"), 800);
      })
      .catch((err) => {
        setStatus(err.response?.data?.message || "Verification failed.");
      });
  }, [searchParams, navigate]);

  const submitOtp = async (e) => {
    e.preventDefault();
    const email = String(form.email || "").trim();
    const otp = String(form.otp || "").trim();
    if (!email || !otp) {
      pushToast({
        type: "warning",
        title: "Missing details",
        message: "Email and verification code are required.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await verifyEmailOtp({ email, otp });
      pushToast({
        type: "success",
        title: "Verified",
        message: res?.message || "Email verified successfully.",
      });
      navigate("/login");
    } catch (err) {
      pushToast({
        type: "error",
        title: "Verification failed",
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Verification failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    const email = String(form.email || "").trim();
    if (!email) {
      pushToast({
        type: "warning",
        title: "Email required",
        message: "Enter your email first.",
      });
      return;
    }

    try {
      const res = await resendVerificationEmail(email);
      pushToast({
        type: "success",
        title: "Code sent",
        message: res?.message || "Check your email inbox/spam.",
      });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Resend failed",
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Could not resend verification code.",
      });
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <h2 className="h4 mb-2">Verify Email</h2>

      {token ? (
        <div className="pg-muted">{status}</div>
      ) : (
        <>
          <div className="pg-muted mb-3">
            Enter the 6-digit code sent to your email. It expires in 10 minutes.
          </div>

          <form onSubmit={submitOtp} className="pg-form">
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Verification code</label>
              <input
                className="form-control"
                inputMode="numeric"
                maxLength={6}
                value={form.otp}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                placeholder="123456"
                required
              />
            </div>

            <button
              className="btn btn-primary w-100 pg-btn"
              type="submit"
              disabled={isSubmitting}
            >
              Verify
            </button>

            <div className="mt-3 text-center">
              <button
                type="button"
                className="btn btn-link p-0 small"
                onClick={resendOtp}
              >
                Resend code
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default VerifyEmail;
