import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout as apiLogout } from "../services/authService";
import {
  getUnreadRealtimeNotificationsCount,
  REALTIME_NOTIFICATIONS_EVENT,
} from "../utils/realtimeNotifications";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? "light" : "dark";
  });

  const [unreadCount, setUnreadCount] = useState(() =>
    getUnreadRealtimeNotificationsCount(),
  );

  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const sync = () => setUnreadCount(getUnreadRealtimeNotificationsCount());
    sync();
    window.addEventListener(REALTIME_NOTIFICATIONS_EVENT, sync);
    return () => window.removeEventListener(REALTIME_NOTIFICATIONS_EVENT, sync);
  }, []);

  useEffect(() => {
    // Route changes can happen without a storage event; keep badge accurate.
    setUnreadCount(getUnreadRealtimeNotificationsCount());
  }, [location.pathname]);

  const NotificationsLink = ({ to, children }) => (
    <NavLink
      className="nav-link pg-topbar-link position-relative"
      to={to}
      onClick={closeMobileMenu}
    >
      {children}
      {unreadCount > 0 ? (
        <span
          className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
          aria-label="New notifications"
        >
          <span className="visually-hidden">New notifications</span>
        </span>
      ) : null}
    </NavLink>
  );

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    } finally {
      navigate("/login");
    }
  };

  const closeMobileMenu = () => {
    const el = document.getElementById("pgNav");
    if (el && el.classList.contains("show")) el.classList.remove("show");
  };

  const goToSection = (id) => {
    const scroll = () => {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth" });
      closeMobileMenu();
    };

    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(scroll, 50);
      return;
    }

    scroll();
  };

  const goFindPg = () => {
    closeMobileMenu();

    if (token && role === "student") {
      navigate("/student/search");
      return;
    }

    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg pg-topbar sticky-top">
      <div className="container pg-container">
        <div className="pg-topbar-shell w-100">
          <span
            className="navbar-brand pg-topbar-brand"
            role="button"
            onClick={() => {
              closeMobileMenu();
              navigate("/");
            }}
          >
            PG Explorer
          </span>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#pgNav"
            aria-controls="pgNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="pgNav">
            <div className="navbar-nav mx-auto gap-lg-4 gap-2 align-items-lg-center">
              {!token && (
                <>
                  <button
                    type="button"
                    className="nav-link btn btn-link p-0 pg-topbar-link"
                    onClick={goFindPg}
                  >
                    Find PG
                  </button>
                  <button
                    type="button"
                    className="nav-link btn btn-link p-0 pg-topbar-link"
                    onClick={() => goToSection("about")}
                  >
                    About
                  </button>
                  <button
                    type="button"
                    className="nav-link btn btn-link p-0 pg-topbar-link"
                    onClick={() => goToSection("student")}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    className="nav-link btn btn-link p-0 pg-topbar-link"
                    onClick={() => goToSection("owner")}
                  >
                    Owner
                  </button>
                </>
              )}

              {token && role === "student" && (
                <>
                  <button
                    type="button"
                    className="nav-link btn btn-link p-0 pg-topbar-link"
                    onClick={goFindPg}
                  >
                    Find PG
                  </button>

                  <NotificationsLink to="/notifications">
                    Notifications
                  </NotificationsLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/student/dashboard"
                    onClick={closeMobileMenu}
                  >
                    Dashboard
                  </NavLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/student/bookings"
                    onClick={closeMobileMenu}
                  >
                    My Bookings
                  </NavLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/student/favorites"
                    onClick={closeMobileMenu}
                  >
                    Favorites
                  </NavLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/student/profile"
                    onClick={closeMobileMenu}
                  >
                    Profile
                  </NavLink>
                </>
              )}

              {token && role === "owner" && (
                <>
                  <NotificationsLink to="/notifications">
                    Notifications
                  </NotificationsLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/owner/dashboard"
                    onClick={closeMobileMenu}
                  >
                    Dashboard
                  </NavLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/owner/pgs"
                    onClick={closeMobileMenu}
                  >
                    My PGs
                  </NavLink>
                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/owner/bookings"
                    onClick={closeMobileMenu}
                  >
                    Bookings
                  </NavLink>
                </>
              )}

              {token && role === "admin" && (
                <>
                  <NotificationsLink to="/notifications">
                    Notifications
                  </NotificationsLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/admin/dashboard"
                    onClick={closeMobileMenu}
                  >
                    Dashboard
                  </NavLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/admin/users"
                    onClick={closeMobileMenu}
                  >
                    Users
                  </NavLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/admin/pgs"
                    onClick={closeMobileMenu}
                  >
                    PGs
                  </NavLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/admin/bookings"
                    onClick={closeMobileMenu}
                  >
                    Bookings
                  </NavLink>

                  <NavLink
                    className="nav-link pg-topbar-link"
                    to="/admin/announcements"
                    onClick={closeMobileMenu}
                  >
                    Announcements
                  </NavLink>
                </>
              )}
            </div>

            <div className="d-flex align-items-center gap-2 ms-lg-auto pg-topbar-actions">
              <button
                type="button"
                className="btn btn-outline-light pg-btn"
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
              >
                {theme === "light" ? "Dark" : "Light"}
              </button>

              {!token ? (
                <NavLink
                  className="btn pg-btn pg-topbar-login"
                  to="/login"
                  onClick={closeMobileMenu}
                >
                  Log In
                </NavLink>
              ) : (
                <button
                  type="button"
                  className="btn pg-btn pg-topbar-login"
                  onClick={logout}
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
