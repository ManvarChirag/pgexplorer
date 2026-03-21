import { useEffect } from "react";
import { getSocket } from "../utils/socket";
import { pushRealtimeNotification } from "../utils/realtimeNotifications";
import { syncNotifications } from "../services/notificationService";
import { getCurrentUserId } from "../utils/jwt";

const LAST_SYNC_KEY = "realtimeNotifications:lastSync";

const scopedKey = (base, userId) => (userId ? `${base}:${userId}` : base);

const getLastSync = (userId) => {
  try {
    return localStorage.getItem(scopedKey(LAST_SYNC_KEY, userId)) || null;
  } catch {
    return null;
  }
};

const setLastSync = (iso, userId) => {
  try {
    localStorage.setItem(scopedKey(LAST_SYNC_KEY, userId), iso);
  } catch {
    // ignore
  }
};

const alreadyHave = (type, payload, userId) => {
  try {
    const raw = localStorage.getItem(
      scopedKey("realtimeNotifications", userId),
    );
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return false;

    const bookingId = payload?.bookingId;
    const announcementId = payload?.id || payload?._id;

    // IMPORTANT: booking notifications can arrive from both socket + sync with different
    // timestamp fields (createdAt vs updatedAt). Dedup strictly by bookingId.
    const key = bookingId
      ? `booking:${String(bookingId)}`
      : type === "announcement" && announcementId
        ? `announcement:${String(announcementId)}`
        : null;

    if (!key) return false;
    return items.some((it) => {
      const p = it?.payload;
      const bid = p?.bookingId;
      const annId = p?.id || p?._id;
      const k = bid
        ? `booking:${String(bid)}`
        : it.type === "announcement" && annId
          ? `announcement:${String(annId)}`
          : null;
      return k === key;
    });
  } catch {
    return false;
  }
};

const RealtimeNotificationsListener = () => {
  useEffect(() => {
    const socket = getSocket();

    const onAnnouncement = (a) =>
      pushRealtimeNotification("announcement", a, getCurrentUserId());
    const onBookingNew = (b) =>
      pushRealtimeNotification("booking:new", b, getCurrentUserId());
    const onBookingUpdated = (b) =>
      pushRealtimeNotification("booking:updated", b, getCurrentUserId());
    const onBookingCancelled = (b) =>
      pushRealtimeNotification("booking:cancelled", b, getCurrentUserId());

    socket.on("announcement:new", onAnnouncement);
    socket.on("booking:new", onBookingNew);
    socket.on("booking:updated", onBookingUpdated);
    socket.on("booking:cancelled", onBookingCancelled);

    let stopped = false;
    let syncing = false;

    const doSync = async () => {
      if (stopped) return;
      const token = sessionStorage.getItem("token");
      if (!token) return;

      if (syncing) return;
      syncing = true;

      const userId = getCurrentUserId();

      try {
        const raw = localStorage.getItem(
          scopedKey("realtimeNotifications", userId),
        );
        const items = raw ? JSON.parse(raw) : [];
        const isEmpty = !Array.isArray(items) || items.length === 0;

        const last = isEmpty ? null : getLastSync(userId);
        const res = await syncNotifications({ since: last || undefined });
        const events = Array.isArray(res?.events) ? res.events : [];

        for (const ev of events) {
          if (!ev?.type) continue;
          if (alreadyHave(ev.type, ev.payload, userId)) continue;
          pushRealtimeNotification(ev.type, ev.payload, userId);
        }

        setLastSync(new Date().toISOString(), userId);
      } catch {
        // ignore sync failures; realtime may still work
      } finally {
        syncing = false;
      }
    };

    // Initial sync (covers missed realtime)
    doSync();

    // Also sync as soon as realtime connects/reconnects.
    const onConnect = () => doSync();
    socket.on("connect", onConnect);

    // Sync on tab focus/visibility so user sees updates instantly.
    const onFocus = () => doSync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") doSync();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    // Poll as a safety net (reduced interval to feel instant if realtime is flaky)
    const t = window.setInterval(doSync, 5000);

    return () => {
      stopped = true;
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      socket.off("connect", onConnect);
      socket.off("announcement:new", onAnnouncement);
      socket.off("booking:new", onBookingNew);
      socket.off("booking:updated", onBookingUpdated);
      socket.off("booking:cancelled", onBookingCancelled);
    };
  }, []);

  return null;
};

export default RealtimeNotificationsListener;
