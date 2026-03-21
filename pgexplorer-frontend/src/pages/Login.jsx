import { useEffect, useState } from "react";
import { loginUser, resendVerificationEmail } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useToast } from "../components/ToastProvider";

const getRouteForRole = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "owner") return "/owner/dashboard";
  if (role === "student") return "/student/dashboard";
  return "/";
};

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [lastError, setLastError] = useState("");
  const navigate = useNavigate();
  const { pushToast } = useToast();

  useEffect(() => {
    // If already logged in (e.g., after refresh), don't keep showing /login.
    const token = localStorage.getItem("token");
    if (!token) return;
    const role = localStorage.getItem("role");
    navigate(getRouteForRole(role), { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLastError("");
      const data = await loginUser(form);
      const role = data?.role || localStorage.getItem("role");
      navigate(getRouteForRole(role), { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please try again.";
      setLastError(msg);
      pushToast({ type: "error", title: "Login failed", message: msg });
    }
  };

  const canResend =
    String(lastError || "")
      .toLowerCase()
      .includes("verify your email") &&
    String(form.email || "").trim().length > 0;

  const handleResend = async () => {
    try {
      const res = await resendVerificationEmail(form.email);

      const devOtp = res?.otpDevOnly;
      if (devOtp) {
        pushToast({
          type: "info",
          title: "Dev OTP",
          message: `Your code is: ${devOtp}`,
        });
      }

      navigate(`/enter-otp?email=${encodeURIComponent(form.email)}`);

      pushToast({
        type: "success",
        title: "Verification sent",
        message: res?.message || "Please check your email inbox/spam.",
      });
    } catch (err) {
      const status = err?.response?.status;
      const fallbackMsg =
        status === 404
          ? "Resend endpoint not found (404). Redeploy the backend (Render) with the latest code, then try again."
          : "Could not resend verification email.";
      pushToast({
        type: "error",
        title: "Resend failed",
        message: err?.response?.data?.message || err?.message || fallbackMsg,
      });
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-5">
        <div className="pg-glass rounded-4 p-4 p-md-5">
          <div className="mb-4">
            <h1 className="h4 pg-title mb-1">Welcome back</h1>
            <div className="pg-muted">Login to continue to PG Explorer</div>
          </div>

          <form onSubmit={handleSubmit} className="pg-form">
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button className="btn btn-primary w-100 pg-btn" type="submit">
              Login
            </button>

            <div className="mt-3 text-center">
              <Link className="pg-muted small" to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            {canResend && (
              <div className="mt-2 text-center">
                <button
                  type="button"
                  className="btn btn-link p-0 small"
                  onClick={handleResend}
                >
                  Resend verification email
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
