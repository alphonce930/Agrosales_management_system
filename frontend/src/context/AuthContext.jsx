import { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "../services/api";

const AuthContext = createContext();
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;
const SESSION_WARNING_TIME = 5 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = "auth_last_activity";
const ACTIVITY_EVENT = "auth_activity";

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("auth_user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    localStorage.removeItem("auth_user");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        const { data } = await api.get("/auth/me");
        setUser(data.user);
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      } catch (error) {
        // Only discard the session when the server confirms the token is no
        // longer valid. A temporary network/database error must not log out a
        // user on page refresh.
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("auth_user");
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  useEffect(() => {
    if (!token || !user) return undefined;

    const clearSessionTimers = () => {
      window.clearTimeout(inactivityTimer.current);
      window.clearTimeout(warningTimer.current);
    };

    const readLastActivity = () =>
      Number(localStorage.getItem(ACTIVITY_STORAGE_KEY)) || Date.now();

    const expireSession = () => {
      const lastActivity = readLastActivity();
      if (Date.now() - lastActivity < INACTIVITY_TIMEOUT) {
        scheduleTimers(lastActivity);
        return;
      }

      clearSessionTimers();
      localStorage.removeItem("token");
      localStorage.removeItem("auth_user");
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common.Authorization;
      setSessionWarning(false);
      setSessionMessage(
        "Your session has expired due to inactivity. Please log in again.",
      );
    };

    const scheduleTimers = (lastActivity) => {
      clearSessionTimers();
      const timeSinceActivity = Date.now() - lastActivity;
      const timeUntilExpiry = INACTIVITY_TIMEOUT - timeSinceActivity;
      const timeUntilWarning = timeUntilExpiry - SESSION_WARNING_TIME;

      if (timeUntilExpiry <= 0) {
        expireSession();
        return;
      }

      warningTimer.current = window.setTimeout(
        () => {
          if (
            Date.now() - readLastActivity() >=
            INACTIVITY_TIMEOUT - SESSION_WARNING_TIME
          ) {
            setSessionWarning(true);
          }
        },
        Math.max(0, timeUntilWarning),
      );
      inactivityTimer.current = window.setTimeout(
        expireSession,
        timeUntilExpiry,
      );
    };

    const recordActivity = () => {
      const now = Date.now();
      const lastActivity = readLastActivity();
      if (now - lastActivity < 1000) return;
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
      window.dispatchEvent(new Event(ACTIVITY_EVENT));
      setSessionWarning(false);
      scheduleTimers(now);
    };

    const handleStorageChange = (event) => {
      if (event.key === ACTIVITY_STORAGE_KEY && event.newValue) {
        setSessionWarning(false);
        scheduleTimers(Number(event.newValue));
      }
      if (event.key === "token" && !event.newValue) {
        clearSessionTimers();
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common.Authorization;
      }
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
    ];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    );
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(ACTIVITY_EVENT, recordActivity);

    const initialActivity = readLastActivity();
    if (!localStorage.getItem(ACTIVITY_STORAGE_KEY))
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(initialActivity));
    scheduleTimers(initialActivity);

    return () => {
      clearSessionTimers();
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity),
      );
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(ACTIVITY_EVENT, recordActivity);
    };
  }, [token, user]);

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    localStorage.setItem("token", data.token);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    setToken(data.token);
    setUser(data.user);
    setSessionWarning(false);
    setSessionMessage("");
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    return data;
  };

  const googleLogin = async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    localStorage.setItem("token", data.token);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
    setToken(data.token);
    setUser(data.user);
    setSessionWarning(false);
    setSessionMessage("");
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    return data;
  };

  const logout = () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) api.post("/auth/logout", { refreshToken }).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setSessionWarning(false);
    setSessionMessage("");
    delete api.defaults.headers.common.Authorization;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        googleLogin,
        logout,
        setUser,
        sessionWarning,
        sessionMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
