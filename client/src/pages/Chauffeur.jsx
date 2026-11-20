import { useEffect, useState } from "react";
import { api } from "../services/api";
import Navbar from "../components/Navbar";

export default function Chauffeur() {
  const [reservations, setReservations] = useState([]);
  const [code, setCode] = useState("");
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");

  function charger() {
    api("/reservations/chauffeur")
      .then(setReservations)
      .catch((e) => setErreur(e.message));
  }

  useEffect(charger, []);

  async function scanner(e) {
    e.preventDefault();
    setResultat(null);
    try {
      const data = await api("/reservations/scan", {
        method: "POST",
        body: { code: code.trim() },
      });
      setResultat({ ok: true, ...data });
      setCode("");
      charger();
    } catch (err) {
      setResultat({ ok: false, message: err.message });
    }
  }

  return (
    <div>
      <Navbar />
      <h1>Espace chauffeur</h1>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}

      <h2>Valider un QR code</h2>
      <form onSubmit={scanner}>
        <input
          placeholder="Code du QR (32 caractères)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ width: 320 }}
          required
        />
        <button type="submit">Valider</button>
      </form>

      {resultat && (
        <div
          style={{
            border: `2px solid ${resultat.ok ? "green" : "red"}`,
            padding: 12,
            margin: "12px 0",
          }}
        >
          {resultat.ok ? (
            <>
              <h3>✅ {resultat.message}</h3>
              <p>
                Client : {resultat.client} ({resultat.nb_places} place(s))
              </p>
              <p>
                {resultat.trajet.depart} → {resultat.trajet.arrivee},{" "}
                {new Date(resultat.trajet.date_depart).toLocaleString("fr-FR")}
              </p>
            </>
          ) : (
            <h3>❌ {resultat.message}</h3>
          )}
        </div>
      )}

      <h2>Réservations de mes trajets</h2>
      {reservations.length === 0 ? (
        <p>Aucune réservation.</p>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Trajet</th>
              <th>Date</th>
              <th>Client</th>
              <th>Téléphone</th>
              <th>Places</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td>{r.depart} → {r.arrivee}</td>
                <td>{new Date(r.date_depart).toLocaleString("fr-FR")}</td>
                <td>{r.prenom} {r.nom}</td>
                <td>{r.telephone || "-"}</td>
                <td>{r.nb_places}</td>
                <td>{r.utilise ? "embarqué" : r.statut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
