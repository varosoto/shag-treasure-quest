export type StoredTeam = { id: string; name: string };

const KEY = "seaholm.team";

export function getStoredTeam(): StoredTeam | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredTeam) : null;
  } catch {
    return null;
  }
}

export function setStoredTeam(t: StoredTeam) {
  localStorage.setItem(KEY, JSON.stringify(t));
}

export function clearStoredTeam() {
  localStorage.removeItem(KEY);
}
