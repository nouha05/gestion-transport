import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function ReservationsAdmin() {
  const [liste, setListe] = useState([]);
  const [erreur, setErreur] = useState("");

  function charger() {
    api("/reservations").then(setListe).catch((e) => setErreur(e.message));
  }
  useEffect(charger, []);

  async function annuler(id) {
    if (!window.confirm("Annuler cette réservation ?")) return;
    setErreur("");
    try {
      await api(`/reservations/${id}/annuler`, { method: "PATCH" });
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div>
      <h2>Toutes les réservations</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>N°</th><th>Client (ID)</th><th>Trajet</th><th>Date</th>
            <th>Places</th><th>Prix</th><th>Statut</th><th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.utilisateur_id}</td>
              <td>{r.depart} → {r.arrivee}</td>
              <td>{new Date(r.date_depart).toLocaleString("fr-FR")}</td>
              <td>{r.nb_places}</td>
              <td>{r.prix}</td>
              <td>{r.utilise ? "embarqué" : r.statut}</td>
              <td>
                {r.statut !== "annulee" && !r.utilise && (
                  <button onClick={() => annuler(r.id)}>Annuler</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
