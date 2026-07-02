export type StoredTeam = { id: string; name: string };

const KEY = "seaholm.team";

export function getStoredTeam(): StoredTeam | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTeam>;
    if (!parsed.id || !parsed.name) return null;
    return { id: parsed.id, name: parsed.name };
  } catch {
    return null;
  }
}

export function setStoredTeam(t: StoredTeam) {
  localStorage.setItem(KEY, JSON.stringify({ id: t.id, name: t.name }));
}

export function clearStoredTeam() {
  localStorage.removeItem(KEY);
}
