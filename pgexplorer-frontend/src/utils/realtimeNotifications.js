import { getCurrentUserId } from "./jwt";

export const REALTIME_NOTIFICATIONS_KEY = "realtimeNotifications";
export const REALTIME_NOTIFICATIONS_EVENT = "realtimeNotifications:updated";
export const REALTIME_NOTIFICATIONS_LAST_SEEN_KEY =
  "realtimeNotifications:lastSeenAt";

const scopedKey = (base, userId) => {
  const uid = userId || getCurrentUserId();
  return uid ? `${base}:${uid}` : base;
};

const getItemTime = (it) => {
  const when =
    it?.payload?.updatedAt || it?.payload?.createdAt || it?.createdAt || null;
  const d = when ? new Date(when) : null;
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
};

const sortNewestFirst = (items) => {
  if (!Array.isArray(items) || items.length <= 1)
    return Array.isArray(items) ? items : [];
  return [...items].sort((a, b) => getItemTime(b) - getItemTime(a));
};

const getDedupeKey = (type, payload) => {
  const bookingId = payload?.bookingId;
  if (bookingId) return `booking:${String(bookingId)}`;

  if (type === "announcement") {
    const id = payload?.id || payload?._id;
    if (id) return `announcement:${String(id)}`;
  }

  return null;
};

export const readRealtimeNotifications = (userId) => {
  try {
    const raw = localStorage.getItem(
      scopedKey(REALTIME_NOTIFICATIONS_KEY, userId),
    );
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? sortNewestFirst(parsed) : [];
  } catch {
    return [];
  }
};

export const writeRealtimeNotifications = (items, userId) => {
  const safe = Array.isArray(items) ? items : [];
  const sorted = sortNewestFirst(safe);
  localStorage.setItem(
    scopedKey(REALTIME_NOTIFICATIONS_KEY, userId),
    JSON.stringify(sorted),
  );
  try {
    window.dispatchEvent(new CustomEvent(REALTIME_NOTIFICATIONS_EVENT));
  } catch {
    // ignore
  }
};

export const getLastSeenAt = (userId) => {
  try {
    return (
      localStorage.getItem(
        scopedKey(REALTIME_NOTIFICATIONS_LAST_SEEN_KEY, userId),
      ) || null
    );
  } catch {
    return null;
  }
};

export const markRealtimeNotificationsSeen = (userId) => {
  try {
    localStorage.setItem(
      scopedKey(REALTIME_NOTIFICATIONS_LAST_SEEN_KEY, userId),
      new Date().toISOString(),
    );
  } catch {
    // ignore
  }

  try {
    window.dispatchEvent(new CustomEvent(REALTIME_NOTIFICATIONS_EVENT));
  } catch {
    // ignore
  }
};

export const getUnreadRealtimeNotificationsCount = (userId) => {
  const lastSeen = getLastSeenAt(userId);
  const lastSeenDate = lastSeen ? new Date(lastSeen) : null;
  const lastSeenTime =
    lastSeenDate && !Number.isNaN(lastSeenDate.getTime())
      ? lastSeenDate.getTime()
      : 0;

  const items = readRealtimeNotifications(userId);
  if (!Array.isArray(items) || items.length === 0) return 0;
  let count = 0;
  for (const it of items) {
    const t = getItemTime(it);
    if (t > lastSeenTime) count += 1;
  }
  return count;
};

export const pushRealtimeNotification = (type, payload, userId) => {
  const prev = readRealtimeNotifications(userId);

  const key = getDedupeKey(type, payload);
  if (key) {
    const idx = prev.findIndex((it) => getDedupeKey(it?.type, it?.payload) === key);
    if (idx >= 0) {
      const existing = prev[idx];
      const mergedPayload = {
        ...(existing?.payload || {}),
        ...(payload || {}),
      };

      const updated = {
        ...existing,
        type,
        payload: mergedPayload,
        // bump to top and make it count as unread if user hasn't viewed it
        createdAt: new Date().toISOString(),
      };

      const next = [...prev];
      next[idx] = updated;
      const sorted = sortNewestFirst(next).slice(0, 50);
      writeRealtimeNotifications(sorted, userId);
      return updated;
    }
  }

  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };

  const next = sortNewestFirst([item, ...prev]).slice(0, 50);
  writeRealtimeNotifications(next, userId);
  return item;
};

export const clearRealtimeNotifications = (userId) => {
  localStorage.removeItem(scopedKey(REALTIME_NOTIFICATIONS_KEY, userId));
  try {
    window.dispatchEvent(new CustomEvent(REALTIME_NOTIFICATIONS_EVENT));
  } catch {
    // ignore
  }
};
