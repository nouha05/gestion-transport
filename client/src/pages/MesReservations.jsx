import { useEffect, useState } from "react";
import { api } from "../services/api";
import Navbar from "../components/Navbar";

export default function MesReservations() {
  const [reservations, setReservations] = useState([]);
  const [erreur, setErreur] = useState("");
  const [qr, setQr] = useState(null);

  function charger() {
    api("/reservations/mine")
      .then(setReservations)
      .catch((e) => setErreur(e.message));
  }

  useEffect(charger, []);

  async function voirQr(id) {
    setErreur("");
    try {
      const data = await api(`/reservations/${id}/qr`);
      setQr({ id, image: data.qr_image });
    } catch (e) {
      setErreur(e.message);
    }
  }

  async function annuler(id) {
    if (!window.confirm("Annuler cette réservation ?")) return;
    setErreur("");
    try {
      await api(`/reservations/${id}/annuler`, { method: "PATCH" });
      if (qr?.id === id) setQr(null);
      charger();
    } catch (e) {
      setErreur(e.message);
    }
  }

  return (
    <div>
      <Navbar />
      <h1>Mes réservations</h1>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      {qr && (
        <div style={{ border: "2px solid #888", padding: 12, margin: "12px 0" }}>
          <p>QR code de la réservation n°{qr.id}</p>
          <img src={qr.image} alt="QR code" width="200" />
          <br />
          <button onClick={() => setQr(null)}>Fermer</button>
        </div>
      )}

      {reservations.length === 0 ? (
        <p>Aucune réservation pour le moment.</p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>N°</th>
              <th>Trajet</th>
              <th>Date</th>
              <th>Places</th>
              <th>Prix (DT)</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.depart} → {r.arrivee}</td>
                <td>{new Date(r.date_depart).toLocaleString("fr-FR")}</td>
                <td>{r.nb_places}</td>
                <td>{r.prix}</td>
                <td>{r.utilise ? "utilisée" : r.statut}</td>
                <td>
                  {r.statut !== "annulee" && (
                    <button onClick={() => voirQr(r.id)}>QR code</button>
                  )}{" "}
                  {r.statut !== "annulee" && !r.utilise && (
                    <button onClick={() => annuler(r.id)}>Annuler</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
