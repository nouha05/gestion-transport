import { useEffect, useState } from "react";
import { api } from "../services/api";

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const VIDE = {
  depart: "", arrivee: "", date_depart: "", prix: "",
  places_total: "", vehicule_id: "", chauffeur_id: "", statut: "planifie",
};

export default function TrajetsAdmin() {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState(VIDE);
  const [editId, setEditId] = useState(null);
  const [erreur, setErreur] = useState("");

  function charger() {
    api("/trajets").then(setListe).catch((e) => setErreur(e.message));
  }
  useEffect(charger, []);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur("");
    const body = {
      depart: form.depart,
      arrivee: form.arrivee,
      date_depart: new Date(form.date_depart).toISOString(),
      prix: Number(form.prix),
      places_total: Number(form.places_total),
      vehicule_id: form.vehicule_id ? Number(form.vehicule_id) : null,
      chauffeur_id: form.chauffeur_id ? Number(form.chauffeur_id) : null,
      statut: form.statut,
    };
    try {
      await api(editId ? `/trajets/${editId}` : "/trajets", {
        method: editId ? "PUT" : "POST",
        body,
      });
      setForm(VIDE);
      setEditId(null);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function modifier(t) {
    setEditId(t.id);
    setForm({
      depart: t.depart,
      arrivee: t.arrivee,
      date_depart: toLocalInput(t.date_depart),
      prix: t.prix,
      places_total: t.places_total,
      vehicule_id: t.vehicule_id ?? "",
      chauffeur_id: t.chauffeur_id ?? "",
      statut: t.statut,
    });
    window.scrollTo(0, 0);
  }

  async function supprimer(id) {
    if (!window.confirm("Supprimer ce trajet ?")) return;
    setErreur("");
    try {
      await api(`/trajets/${id}`, { method: "DELETE" });
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div>
      <h2>{editId ? `Modifier le trajet n°${editId}` : "Nouveau trajet"}</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      <form onSubmit={enregistrer} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input name="depart" placeholder="Départ" value={form.depart} onChange={change} required />
        <input name="arrivee" placeholder="Arrivée" value={form.arrivee} onChange={change} required />
        <input name="date_depart" type="datetime-local" value={form.date_depart} onChange={change} required />
        <input name="prix" type="number" step="0.01" min="0" placeholder="Prix (DT)" value={form.prix} onChange={change} required />
        <input name="places_total" type="number" min="1" placeholder="Places" value={form.places_total} onChange={change} required />
        <input name="vehicule_id" type="number" placeholder="ID véhicule (option)" value={form.vehicule_id} onChange={change} />
        <input name="chauffeur_id" type="number" placeholder="ID chauffeur (option)" value={form.chauffeur_id} onChange={change} />
        <select name="statut" value={form.statut} onChange={change}>
          <option value="planifie">planifie</option>
          <option value="en_cours">en_cours</option>
          <option value="termine">termine</option>
          <option value="annule">annule</option>
        </select>
        <button type="submit">{editId ? "Enregistrer" : "Créer"}</button>
        {editId && (
          <button type="button" onClick={() => { setEditId(null); setForm(VIDE); }}>
            Annuler la modification
          </button>
        )}
      </form>

      <h2>Tous les trajets</h2>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>ID</th><th>Trajet</th><th>Date</th><th>Prix</th>
            <th>Places</th><th>Véhicule</th><th>Chauffeur</th><th>Statut</th><th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.depart} → {t.arrivee}</td>
              <td>{new Date(t.date_depart).toLocaleString("fr-FR")}</td>
              <td>{t.prix}</td>
              <td>{t.places_restantes} / {t.places_total}</td>
              <td>{t.vehicule_id ?? "-"}</td>
              <td>{t.chauffeur_id ?? "-"}</td>
              <td>{t.statut}</td>
              <td>
                <button onClick={() => modifier(t)}>Modifier</button>{" "}
                <button onClick={() => supprimer(t.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
