import { NavLink } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="pg-footer mt-auto">
      <div className="container pg-container py-5">
        <div className="row g-4">
          <div className="col-12 col-md-4 col-lg-3">
            <div className="pg-footer-title">About PG Explorer</div>
            <div className="pg-footer-text mt-2">
              Your trusted platform to find PG accommodations and manage
              listings.
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <div className="pg-footer-title">Popular Cities</div>
            <ul className="pg-footer-list mt-2">
              <li className="pg-footer-text">PG in Bangalore</li>
              <li className="pg-footer-text">PG in Mumbai</li>
              <li className="pg-footer-text">PG in Delhi</li>
              <li className="pg-footer-text">PG in Pune</li>
            </ul>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <div className="pg-footer-title">Quick Links</div>
            <ul className="pg-footer-list mt-2">
              <li>
                <NavLink className="pg-footer-link" to="/owner/register">
                  List Your PG
                </NavLink>
              </li>
              <li>
                <NavLink className="pg-footer-link" to="/login">
                  Login
                </NavLink>
              </li>
              <li>
                <NavLink className="pg-footer-link" to="/">
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink className="pg-footer-link" to="/about">
                  About
                </NavLink>
              </li>
            </ul>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <div className="pg-footer-title">Contact</div>
            <ul className="pg-footer-list mt-2">
              <li className="pg-footer-text">Email: support@pgexplorer.com</li>
              <li className="pg-footer-text">Phone: +91 1800-456-7890</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="pg-footer-bottom">
        <div className="container pg-container py-3">
          <div className="text-center pg-footer-bottom-text">
            © {year} PG Explorer. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
