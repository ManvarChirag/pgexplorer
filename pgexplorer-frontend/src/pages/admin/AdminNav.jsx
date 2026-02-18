import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `btn btn-sm pg-btn ${isActive ? "btn-primary" : "btn-outline-light"}`;

const AdminNav = () => {
  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      <NavLink className={linkClass} to="/admin/dashboard">
        Dashboard
      </NavLink>
      <NavLink className={linkClass} to="/admin/users">
        Users
      </NavLink>
      <NavLink className={linkClass} to="/admin/pgs">
        PGs
      </NavLink>
      <NavLink className={linkClass} to="/admin/bookings">
        Bookings
      </NavLink>
      <NavLink className={linkClass} to="/admin/announcements">
        Announcements
      </NavLink>
    </div>
  );
};

export default AdminNav;
