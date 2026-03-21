import { useEffect, useState } from "react";
import {
  clearRealtimeNotifications,
  markRealtimeNotificationsSeen,
  readRealtimeNotifications,
  REALTIME_NOTIFICATIONS_EVENT,
  writeRealtimeNotifications,
} from "../utils/realtimeNotifications";
import {
  getOwnerBookings,
  updateBookingStatus,
} from "../services/bookingService";
import { useToast } from "../components/ToastProvider";

const toTitle = (s) => {
  const str = String(s || "").trim();
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const describe = (it) => {
  const type = String(it?.type || "");
  const p = it?.payload || {};

  const pgLabel = p.pgName
    ? `${p.pgName}${p.city ? ` • ${p.city}` : ""}`
    : p.city
      ? p.city
      : "";

  if (type === "announcement") {
    const msg = p.message || p.title || "New announcement";
    return {
      title: "Announcement",
      subtitle: String(msg),
      meta: null,
    };
  }

  if (type === "booking:new" || p.status === "pending") {
    return {
      title: "New booking request",
      subtitle: pgLabel || "A student requested your PG",
    };
  }

  if (type === "booking:cancelled" || p.status === "cancelled") {
    return {
      title: "Booking cancelled",
      subtitle: pgLabel || "A booking was cancelled",
      meta: p.bookingId ? `Booking ID: ${p.bookingId}` : null,
    };
  }

  if (type === "booking:updated") {
    const st = toTitle(p.status || "updated");
    return {
      title: `Booking ${st}`,
      subtitle: pgLabel || "A booking status was updated",
      meta: p.bookingId ? `Booking ID: ${p.bookingId}` : null,
    };
  }

  return {
    title: type || "Notification",
    subtitle: pgLabel || "",
    meta: p.bookingId ? `Booking ID: ${p.bookingId}` : null,
  };
};

const Notifications = () => {
  const [items, setItems] = useState(() => readRealtimeNotifications());
  const [bookingById, setBookingById] = useState(() => new Map());
  const [acting, setActing] = useState(() => new Set());

  const { pushToast } = useToast();

  const role = sessionStorage.getItem("role");

  useEffect(() => {
    const sync = () => setItems(readRealtimeNotifications());
    window.addEventListener(REALTIME_NOTIFICATIONS_EVENT, sync);
    return () => window.removeEventListener(REALTIME_NOTIFICATIONS_EVENT, sync);
  }, []);

  useEffect(() => {
    // Owner: fetch booking details so notifications can show who requested.
    if (role !== "owner") return;

    let alive = true;
    getOwnerBookings()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        const map = new Map();
        for (const b of list) {
          if (!b?._id) continue;
          map.set(String(b._id), b);
        }
        if (alive) setBookingById(map);
      })
      .catch(() => {
        // ignore
      });

    return () => {
      alive = false;
    };
  }, [role]);

  useEffect(() => {
    // When user opens notifications, consider them seen.
    markRealtimeNotificationsSeen();
  }, []);

  const persist = (next) => {
    setItems(next);
    writeRealtimeNotifications(next);
  };

  const isPendingRequest = (it) => {
    if (role !== "owner") return false;
    const p = it?.payload || {};
    const type = String(it?.type || "");
    // booking:new payload may not include status; treat as pending request.
    if (type === "booking:new") return true;
    return String(p.status || "") === "pending";
  };

  const actOnBooking = async (bookingId, status) => {
    const id = String(bookingId || "");
    if (!id) return;

    setActing((prev) => new Set(prev).add(id));
    try {
      const res = await updateBookingStatus(id, status);
      const updatedAt =
        res?.data?.booking?.updatedAt ||
        res?.data?.booking?.updatedAt?.$date ||
        new Date().toISOString();

      // Update local notification(s) for that booking.
      const next = items.map((it) => {
        if (String(it?.payload?.bookingId || "") !== id) return it;
        const payload = { ...(it.payload || {}), status, updatedAt };
        return {
          ...it,
          type: "booking:updated",
          payload,
        };
      });
      persist(next);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update booking status";
      pushToast({ type: "error", title: "Update failed", message: msg });
    } finally {
      setActing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="pg-glass rounded-4 p-4 p-md-5">
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="h4 mb-1">Notifications</h2>
          <div className="pg-muted">Live updates (stored on this device).</div>
        </div>
        <button
          type="button"
          className="btn btn-outline-light pg-btn"
          onClick={() => {
            clearRealtimeNotifications();
            setItems([]);
          }}
        >
          Clear
        </button>
      </div>

      <div className="pg-divider my-4" />

      {items.length === 0 ? (
        <div className="pg-muted">No notifications yet.</div>
      ) : (
        <div className="d-grid gap-2">
          {items.map((it) => {
            const d = describe(it);
            const when =
              it?.payload?.updatedAt || it?.payload?.createdAt || it?.createdAt;
            const bookingId = it?.payload?.bookingId;
            const canAct = isPendingRequest(it) && bookingId;
            const busy = bookingId ? acting.has(String(bookingId)) : false;

            const b = bookingId ? bookingById.get(String(bookingId)) : null;
            const studentName = b?.student?.name;
            const studentEmail = b?.student?.email;
            const who = studentName
              ? studentName
              : studentEmail
                ? studentEmail
                : null;

            return (
              <div key={it.id} className="pg-kpi rounded-4 p-3 p-md-4">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="flex-grow-1">
                    {canAct ? (
                      <div
                        className="text-uppercase pg-muted"
                        style={{ fontSize: 12 }}
                      >
                        Booking request
                      </div>
                    ) : null}

                    <div
                      className={
                        canAct ? "fw-semibold fs-6 mt-1" : "fw-semibold"
                      }
                    >
                      {canAct ? d.subtitle || d.title : d.title}
                    </div>

                    {!canAct && d.subtitle ? (
                      <div className="pg-muted small mt-1">{d.subtitle}</div>
                    ) : null}

                    {canAct && who ? (
                      <div className="pg-muted small mt-2">
                        Requested by <span className="fw-semibold">{who}</span>
                      </div>
                    ) : null}

                    {d.meta ? (
                      <div className="pg-muted small mt-1">{d.meta}</div>
                    ) : null}
                  </div>

                  <div className="text-end">
                    <div
                      className="pg-muted small"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {when ? new Date(when).toLocaleString() : ""}
                    </div>

                    {canAct ? (
                      <div className="d-flex gap-2 justify-content-end mt-3">
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          disabled={busy}
                          onClick={() => actOnBooking(bookingId, "approved")}
                        >
                          {busy ? "Working..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={busy}
                          onClick={() => actOnBooking(bookingId, "rejected")}
                        >
                          {busy ? "Working..." : "Reject"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
