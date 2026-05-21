// Tracks which user account an admin is currently "inside" while browsing
// their escalas. Persisted in sessionStorage so the state survives navigation
// between AdminPanel ↔ TurnaroundForm.

export interface ImpersonatedUser {
  userId: string;
  email: string;
}

const KEY = 'admin-impersonated-user';

export const getImpersonatedUser = (): ImpersonatedUser | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId && parsed?.email) return parsed as ImpersonatedUser;
    return null;
  } catch {
    return null;
  }
};

export const setImpersonatedUser = (u: ImpersonatedUser) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(u));
  } catch {
    /* ignore */
  }
};

export const clearImpersonatedUser = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
