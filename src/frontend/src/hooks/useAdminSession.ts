import { useCallback, useState } from "react";

const SESSION_KEY = "ccb_admin_session";
const ADMIN_PASSWORD = "Shahzad@99";

export function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  const login = useCallback((password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch {}
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setIsAdmin(false);
  }, []);

  return { isAdmin, login, logout };
}
