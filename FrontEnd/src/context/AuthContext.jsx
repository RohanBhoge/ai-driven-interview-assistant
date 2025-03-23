import { createContext, useState, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [userId, setUserId] = useState(localStorage.getItem("userId") || null);

  const login = (token, userId) => {
    localStorage.setItem("token", token);
    setToken(localStorage.getItem("token"));
    localStorage.setItem("userId", userId);
    setUserId(localStorage.getItem("userId"));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    localStorage.removeItem("userId");
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, userId, setUserId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
