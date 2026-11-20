import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <header style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Link to="/trajets">Trajets</Link>
      {user?.role !== "chauffeur" && (
        <Link to="/mes-reservations">Mes réservations</Link>
      )}
      {(user?.role === "chauffeur" || user?.role === "admin") && (
        <Link to="/chauffeur">Espace chauffeur</Link>
      )}
      {user?.role === "admin" && <Link to="/admin">Admin</Link>}
      <span style={{ marginLeft: "auto" }}>
        {user ? `${user.prenom} ${user.nom} (${user.role})` : ""}
      </span>
      <button onClick={logout}>Déconnexion</button>
    </header>
  );
}
