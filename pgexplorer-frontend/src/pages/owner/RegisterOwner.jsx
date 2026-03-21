import { useState } from "react";
import api from "../../utils/axios";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/ToastProvider";

const RegisterOwner = () => {
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    address: "",
    aadharNumber: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const submit = async (e) => {
    e.preventDefault();

    // ✅ client-side validation
    if (form.aadharNumber.length !== 12) {
      pushToast({
        type: "warning",
        title: "Invalid Aadhar",
        message: "Aadhar number must be exactly 12 digits.",
      });
      return;
    }

    if (!/^\d+$/.test(form.aadharNumber)) {
      pushToast({
        type: "warning",
        title: "Invalid Aadhar",
        message: "Aadhar number must contain only digits.",
      });
      return;
    }

    if (form.phone.length < 10) {
      pushToast({
        type: "warning",
        title: "Invalid phone",
        message: "Please enter a valid phone number.",
      });
      return;
    }

    // ✅ build clean payload
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: "owner",
      phone: form.phone.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      aadharNumber: form.aadharNumber.trim(),
    };

    try {
      const res = await api.post("/auth/register", payload);
      pushToast({
        type: "success",
        title: "Registration complete",
        message: res.data?.message || "Owner registered successfully.",
      });

      const devOtp = res.data?.otpDevOnly;
      if (devOtp) {
        pushToast({
          type: "info",
          title: "Dev OTP",
          message: `Your code is: ${devOtp}`,
        });
      }

      navigate(`/enter-otp?email=${encodeURIComponent(payload.email)}`);
    } catch (err) {
      console.error("OWNER REGISTER ERROR:", err.response?.data);
      const status = err?.response?.status;
      pushToast({
        type: "error",
        title: "Registration failed",
        message: status
          ? `[${status}] ${err.response?.data?.message || "Registration failed"}`
          : err.response?.data?.message || "Registration failed",
      });
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-9 col-lg-7">
        <div className="pg-glass rounded-4 p-4 p-md-5">
          <div className="mb-4">
            <h2 className="h4 pg-title mb-1">Owner Registration</h2>
            <div className="pg-muted">
              Create your owner account to add PGs.
            </div>
          </div>

          <form onSubmit={submit} className="pg-form">
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Full Name</label>
                <input
                  name="name"
                  className="form-control"
                  placeholder="Full Name"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Email</label>
                <input
                  name="email"
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Password</label>
                <input
                  name="password"
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Phone</label>
                <input
                  name="phone"
                  className="form-control"
                  placeholder="Phone Number"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">City</label>
                <input
                  name="city"
                  className="form-control"
                  placeholder="City"
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Address</label>
                <textarea
                  name="address"
                  className="form-control"
                  placeholder="Address"
                  onChange={handleChange}
                  required
                  rows={3}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Aadhar Number</label>
                <input
                  name="aadharNumber"
                  className="form-control"
                  placeholder="Aadhar Number"
                  onChange={handleChange}
                  required
                />
                <div className="pg-muted small mt-2">
                  Must be exactly 12 digits.
                </div>
              </div>
            </div>

            <button className="btn btn-primary w-100 pg-btn mt-4" type="submit">
              Register Owner
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterOwner;
