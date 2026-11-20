import { Navigate } from "react-router-dom";

export default function RequireAuth({ children, roles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!token) return <Navigate to="/login" />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/trajets" />;
  return children;
}