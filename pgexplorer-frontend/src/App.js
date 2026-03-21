import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import RealtimeNotificationsListener from "./components/RealtimeNotificationsListener";
import { ToastProvider } from "./components/ToastProvider";

// Pages
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminPGs from "./pages/admin/PGs";
import AdminBookings from "./pages/admin/Bookings";
import AdminAnnouncements from "./pages/admin/Announcements";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StudentLanding from "./pages/students/StudentLanding";
import OwnerLanding from "./pages/owner/OwnerLanding";
import RegisterStudent from "./registerstudent";

import OwnerDashboard from "./pages/owner/Dashboard";
import AddPG from "./pages/owner/AddPG";
import MyPGs from "./pages/owner/MyPGs";
import RegisterOwner from "./pages/owner/RegisterOwner";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerChat from "./pages/owner/Chat";
import StudentBookings from "./pages/students/StudentBookings";
import BookingSummary from "./pages/students/BookingSummary";
import StudentDashboard from "./pages/students/Dashboard";
import Profile from "./pages/students/Profile";
import SearchPG from "./pages/students/SearchPG";
import Favorites from "./pages/students/Favorites";
import StudentChat from "./pages/students/Chat";
import PGDetails from "./pages/PGDetails";
import Notifications from "./pages/Notifications";

function App() {
  return (
    <Router>
      <ToastProvider>
        <div className="pg-app d-flex flex-column">
          {/* Global Navbar */}
          <Navbar />

          {/* Global realtime listener (stores notifications on device) */}
          <RealtimeNotificationsListener />

          <main className="container pg-container py-4 pg-main flex-grow-1">
            <Routes>
              {/* Public */}

              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute role="admin">
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pgs"
                element={
                  <ProtectedRoute role="admin">
                    <AdminPGs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bookings"
                element={
                  <ProtectedRoute role="admin">
                    <AdminBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedRoute role="admin">
                    <AdminAnnouncements />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/student" element={<StudentLanding />} />
              <Route path="/owner" element={<OwnerLanding />} />

              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/enter-otp" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Notifications (all logged-in roles) */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute role={["student", "owner", "admin"]}>
                    <Notifications />
                  </ProtectedRoute>
                }
              />

              {/* Student Registration */}
              <Route path="/student/register" element={<RegisterStudent />} />

              {/* Owner Routes */}
              <Route
                path="/owner/dashboard"
                element={
                  <ProtectedRoute role="owner">
                    <OwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/add-pg"
                element={
                  <ProtectedRoute role="owner">
                    <AddPG />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/pgs"
                element={
                  <ProtectedRoute role="owner">
                    <MyPGs />
                  </ProtectedRoute>
                }
              />
              <Route path="/owner/register" element={<RegisterOwner />} />
              <Route
                path="/owner/bookings"
                element={
                  <ProtectedRoute role="owner">
                    <OwnerBookings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/owner/chat/:pgId/:studentId"
                element={
                  <ProtectedRoute role="owner">
                    <OwnerChat />
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute role="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute role="student">
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/search"
                element={
                  <ProtectedRoute role="student">
                    <SearchPG />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pg/:id"
                element={
                  <ProtectedRoute role="student">
                    <PGDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/bookings"
                element={
                  <ProtectedRoute role="student">
                    <StudentBookings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/bookings/:id"
                element={
                  <ProtectedRoute role="student">
                    <BookingSummary />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/favorites"
                element={
                  <ProtectedRoute role="student">
                    <Favorites />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/chat/:pgId"
                element={
                  <ProtectedRoute role="student">
                    <StudentChat />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>

          <Footer />
        </div>
      </ToastProvider>
    </Router>
  );
}

export default App;
