import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/axios";
import { useToast } from "../../components/ToastProvider";

const AddPG = () => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    city: "",
    rent: "",
    gender: "",
    roomType: "single",
    ac: false,
    deposit: "",
    maintenance: "",
    address: "",
    description: "",
    rules: "",
    totalRooms: "",
    availableRooms: "",
    amenities: "",
  });

  const [images, setImages] = useState([]);
  const [propertyPaper, setPropertyPaper] = useState(null);

  const submit = async (e) => {
    e.preventDefault();

    try {
      if (!images || images.length < 1) {
        pushToast({
          type: "warning",
          title: "Missing photos",
          message: "Please upload at least 1 image.",
        });
        return;
      }

      if (!propertyPaper) {
        pushToast({
          type: "warning",
          title: "Missing document",
          message: "Please upload the PG property paper.",
        });
        return;
      }

      const totalRooms = Math.max(0, Math.trunc(Number(form.totalRooms || 0)));
      const availableRooms = Math.max(
        0,
        Math.trunc(Number(form.availableRooms || 0)),
      );
      if (availableRooms > totalRooms) {
        pushToast({
          type: "warning",
          title: "Check room counts",
          message: "Available rooms cannot be greater than total rooms.",
        });
        return;
      }

      const data = new FormData();
      data.append("name", form.name);
      data.append("city", form.city);
      data.append("rent", form.rent);
      data.append("gender", form.gender);
      data.append("roomType", form.roomType);
      data.append("ac", String(form.ac));
      data.append("deposit", form.deposit);
      data.append("maintenance", form.maintenance);
      data.append("address", form.address);
      data.append("description", form.description);
      data.append("rules", form.rules);
      data.append("totalRooms", form.totalRooms);
      data.append("availableRooms", form.availableRooms);
      data.append("amenities", form.amenities);

      images.forEach((file) => data.append("images", file));
      data.append("propertyPaper", propertyPaper);

      await api.post("/pg/add", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      pushToast({
        type: "success",
        title: "PG added",
        message: "Your listing was created successfully.",
      });

      navigate("/owner/pgs");
    } catch (err) {
      pushToast({
        type: "error",
        title: "Add PG failed",
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to add PG",
      });
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-8">
        <div className="pg-glass rounded-4 p-4 p-md-5">
          <div className="mb-4">
            <h2 className="h4 pg-title mb-1">Add PG</h2>
            <div className="pg-muted">Create a new listing in seconds.</div>
          </div>

          <form onSubmit={submit} className="pg-form">
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">PG Name</label>
                <input
                  className="form-control"
                  placeholder="e.g. Sunrise Residency"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">City</label>
                <input
                  className="form-control"
                  placeholder="e.g. Pune"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Rent</label>
                <input
                  className="form-control"
                  placeholder="e.g. 8000"
                  value={form.rent}
                  onChange={(e) => setForm({ ...form, rent: e.target.value })}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Gender</label>
                <input
                  className="form-control"
                  placeholder="Male / Female"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Room Type</label>
                <select
                  className="form-select"
                  value={form.roomType}
                  onChange={(e) =>
                    setForm({ ...form, roomType: e.target.value })
                  }
                >
                  <option value="single">Single</option>
                  <option value="shared">Shared</option>
                </select>
              </div>

              <div className="col-12 col-md-6 d-flex align-items-end">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.ac}
                    onChange={(e) => setForm({ ...form, ac: e.target.checked })}
                    id="acCheck"
                  />
                  <label className="form-check-label" htmlFor="acCheck">
                    AC
                  </label>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Deposit</label>
                <input
                  className="form-control"
                  placeholder="e.g. 5000"
                  value={form.deposit}
                  onChange={(e) =>
                    setForm({ ...form, deposit: e.target.value })
                  }
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Maintenance</label>
                <input
                  className="form-control"
                  placeholder="e.g. 500"
                  value={form.maintenance}
                  onChange={(e) =>
                    setForm({ ...form, maintenance: e.target.value })
                  }
                />
              </div>

              <div className="col-12">
                <label className="form-label">Address</label>
                <input
                  className="form-control"
                  placeholder="Full address"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="col-12">
                <label className="form-label">Rules & Policies</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.rules}
                  onChange={(e) => setForm({ ...form, rules: e.target.value })}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Total Rooms</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.totalRooms}
                  onChange={(e) =>
                    setForm({ ...form, totalRooms: e.target.value })
                  }
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Available Rooms</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.availableRooms}
                  onChange={(e) =>
                    setForm({ ...form, availableRooms: e.target.value })
                  }
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Amenities</label>
                <input
                  className="form-control"
                  placeholder="wifi, food, laundry"
                  value={form.amenities}
                  onChange={(e) =>
                    setForm({ ...form, amenities: e.target.value })
                  }
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Images (at least 1)</label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  multiple
                  required
                  onChange={(e) => setImages(Array.from(e.target.files || []))}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">PG's Property Paper</label>
                <input
                  className="form-control"
                  type="file"
                  accept="application/pdf,image/*"
                  required
                  onChange={(e) =>
                    setPropertyPaper((e.target.files && e.target.files[0]) || null)
                  }
                />
                <small className="pg-muted d-block mt-1">
                  This PG can be removed or deactivated by admin if paper is invalid.
                </small>
              </div>
            </div>

            <div className="mt-4 d-flex gap-2">
              <button className="btn btn-primary pg-btn" type="submit">
                Add PG
              </button>
              <button
                className="btn btn-outline-light pg-btn"
                type="button"
                onClick={() => {
                  setForm({
                    name: "",
                    city: "",
                    rent: "",
                    gender: "",
                    roomType: "single",
                    ac: false,
                    deposit: "",
                    maintenance: "",
                    address: "",
                    description: "",
                    rules: "",
                    totalRooms: "",
                    availableRooms: "",
                    amenities: "",
                  });
                  setImages([]);
                  setPropertyPaper(null);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPG;
