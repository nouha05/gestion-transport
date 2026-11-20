import { useState } from "react";
import Navbar from "../components/Navbar";
import TrajetsAdmin from "../components/TrajetsAdmin";
import VehiculesAdmin from "../components/VehiculesAdmin";
import ReservationsAdmin from "../components/ReservationsAdmin";

export default function Admin() {
  const [onglet, setOnglet] = useState("trajets");

  return (
    <div>
      <Navbar />
      <h1>Espace admin</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setOnglet("trajets")}>Trajets</button>
        <button onClick={() => setOnglet("vehicules")}>Véhicules</button>
        <button onClick={() => setOnglet("reservations")}>Réservations</button>
      </div>
      {onglet === "trajets" && <TrajetsAdmin />}
      {onglet === "vehicules" && <VehiculesAdmin />}
      {onglet === "reservations" && <ReservationsAdmin />}
    </div>
  );
}
