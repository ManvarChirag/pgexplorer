const STORAGE_KEY = "favoritePgIds";

const isValidObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value));

const normalizeIds = (ids) => {
  const cleaned = (Array.isArray(ids) ? ids : [])
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter(isValidObjectId);

  return Array.from(new Set(cleaned));
};

export const getFavoritePgIds = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = normalizeIds(parsed);

    // Auto-clean if storage contains bad values
    if (Array.isArray(parsed) && normalized.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
};

export const isFavoritePg = (pgId) => {
  if (!pgId) return false;
  const id = String(pgId).trim();
  if (!isValidObjectId(id)) return false;
  return getFavoritePgIds().includes(id);
};

export const toggleFavoritePg = (pgId) => {
  const id = String(pgId || "").trim();
  if (!isValidObjectId(id))
    return { ids: getFavoritePgIds(), isFavorite: false };

  const current = getFavoritePgIds();
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return { ids: next, isFavorite: next.includes(id) };
};

export const removeFavoritePg = (pgId) => {
  const id = String(pgId || "").trim();
  const current = getFavoritePgIds();
  const next = current.filter((x) => x !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};
