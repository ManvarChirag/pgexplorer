import React, { useState } from "react";
import api from "./utils/axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "./components/ToastProvider";

const RegisterStudent = () => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "student",
    name: "",
    college: "",
    branch: "",
    year: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/register", formData);

      // In dev, backend returns a token so you can verify without SMTP
      const verifyToken = res.data?.verifyTokenDevOnly;
      if (verifyToken) {
        navigate(`/verify-email?token=${encodeURIComponent(verifyToken)}`);
        return;
      }

      pushToast({
        type: "success",
        title: "Registration complete",
        message: res.data?.message || "Student registered successfully",
      });
      navigate("/login");
    } catch (err) {
      pushToast({
        type: "error",
        title: "Registration failed",
        message: err.response?.data?.message || "Registration failed",
      });
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-9 col-lg-7">
        <div className="pg-glass rounded-4 p-4 p-md-5">
          <div className="mb-4">
            <h2 className="h4 pg-title mb-1">Student Registration</h2>
            <div className="pg-muted">Create your student profile.</div>
          </div>

          <form onSubmit={handleSubmit} className="pg-form">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  name="email"
                  placeholder="you@example.com"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  name="name"
                  placeholder="Full name"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">College</label>
                <input
                  className="form-control"
                  name="college"
                  placeholder="College"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label">Branch</label>
                <input
                  className="form-control"
                  name="branch"
                  placeholder="Branch"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label">Year</label>
                <input
                  className="form-control"
                  name="year"
                  type="number"
                  placeholder="Year"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button className="btn btn-primary w-100 pg-btn mt-4" type="submit">
              Register
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterStudent;
