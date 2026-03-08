import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Reducer ───────────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case "RESTORE":
      return {
        ...state,
        user: action.user,
        accessToken: action.accessToken,
        refreshToken: action.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case "LOADED":
      return { ...state, isLoading: false };
    case "LOGIN":
      return {
        ...state,
        user: action.user,
        accessToken: action.accessToken,
        refreshToken: action.refreshToken,
        isAuthenticated: true,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      };
    default:
      return state;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore persisted session on mount.
  // Single dispatch call — avoids cascading setState warnings.
  useEffect(() => {
    const storedAccess = localStorage.getItem("accessToken");
    const storedRefresh = localStorage.getItem("refreshToken");
    const storedUser = localStorage.getItem("user");

    if (storedAccess && storedRefresh && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        dispatch({
          type: "RESTORE",
          user: parsedUser,
          accessToken: storedAccess,
          refreshToken: storedRefresh,
        });
        return;
      } catch {
        _clearStorage();
      }
    }
    dispatch({ type: "LOADED" });
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (identifier, password) => {
    const { data: body } = await api.post("/auth/login", {
      identifier,
      password,
    });
    const { user: u, accessToken: at, refreshToken: rt } = body.data;

    localStorage.setItem("accessToken", at);
    localStorage.setItem("refreshToken", rt);
    localStorage.setItem("user", JSON.stringify(u));

    dispatch({ type: "LOGIN", user: u, accessToken: at, refreshToken: rt });
    return u;
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem("refreshToken");
      if (rt) await api.post("/auth/logout", { refreshToken: rt });
    } catch {
      // Best-effort — always clear local state
    }
    _clearStorage();
    dispatch({ type: "LOGOUT" });
  }, []);

  // ── getUser ────────────────────────────────────────────────────────────────
  const getUser = useCallback(() => state.user, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, getUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _clearStorage() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}
