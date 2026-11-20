import { useEffect, useState } from "react";
import { api } from "../services/api";
import Navbar from "../components/Navbar";

export default function Trajets() {
  const [trajets, setTrajets] = useState([]);
  const [places, setPlaces] = useState({});
  const [erreur, setErreur] = useState("");
  const [reservation, setReservation] = useState(null);

  function charger() {
    api("/trajets").then(setTrajets).catch((e) => setErreur(e.message));
  }

  useEffect(charger, []);

  async function reserver(trajet) {
    setErreur("");
    try {
      const data = await api("/reservations", {
        method: "POST",
        body: {
          trajet_id: trajet.id,
          nb_places: Number(places[trajet.id] || 1),
        },
      });
      setReservation({ ...data, trajet });
      charger();
    } catch (e) {
      setErreur(e.message);
    }
  }

  return (
    <div>
      <Navbar />

      <h1>Trajets disponibles</h1>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      {reservation && (
        <div style={{ border: "2px solid green", padding: 12, margin: "12px 0" }}>
          <h2>Réservation confirmée ✅</h2>
          <p>
            {reservation.trajet.depart} → {reservation.trajet.arrivee},{" "}
            {reservation.nb_places} place(s)
          </p>
          <p>Présente ce QR code au chauffeur :</p>
          <img src={reservation.qr_image} alt="QR code" width="200" />
          <br />
          <button onClick={() => setReservation(null)}>Fermer</button>
        </div>
      )}

      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Départ</th>
            <th>Arrivée</th>
            <th>Date</th>
            <th>Prix (DT)</th>
            <th>Places restantes</th>
            <th>Nb places</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trajets.map((t) => (
            <tr key={t.id}>
              <td>{t.depart}</td>
              <td>{t.arrivee}</td>
              <td>{new Date(t.date_depart).toLocaleString("fr-FR")}</td>
              <td>{t.prix}</td>
              <td>{t.places_restantes} / {t.places_total}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  max={t.places_restantes}
                  value={places[t.id] || 1}
                  onChange={(e) =>
                    setPlaces({ ...places, [t.id]: e.target.value })
                  }
                  style={{ width: 60 }}
                />
              </td>
              <td>
                <button
                  disabled={t.places_restantes === 0}
                  onClick={() => reserver(t)}
                >
                  Réserver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
