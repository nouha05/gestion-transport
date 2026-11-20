import { useEffect, useState } from "react";
import { api } from "../services/api";
import Navbar from "../components/Navbar";

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------- Trajets ---------- */
const TRAJET_VIDE = {
  depart: "", arrivee: "", date_depart: "", prix: "",
  places_total: "", vehicule_id: "", chauffeur_id: "", statut: "planifie",
};

function TrajetsAdmin() {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState(TRAJET_VIDE);
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
      setForm(TRAJET_VIDE);
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
          <button type="button" onClick={() => { setEditId(null); setForm(TRAJET_VIDE); }}>
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

/* ---------- Véhicules ---------- */
const VEHICULE_VIDE = {
  immatriculation: "", marque: "", modele: "", capacite: "", statut: "disponible",
};

function VehiculesAdmin() {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState(VEHICULE_VIDE);
  const [editId, setEditId] = useState(null);
  const [erreur, setErreur] = useState("");

  function charger() {
    api("/vehicules").then(setListe).catch((e) => setErreur(e.message));
  }
  useEffect(charger, []);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur("");
    const body = { ...form, capacite: Number(form.capacite) };
    try {
      await api(editId ? `/vehicules/${editId}` : "/vehicules", {
        method: editId ? "PUT" : "POST",
        body,
      });
      setForm(VEHICULE_VIDE);
      setEditId(null);
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function modifier(v) {
    setEditId(v.id);
    setForm({
      immatriculation: v.immatriculation,
      marque: v.marque,
      modele: v.modele,
      capacite: v.capacite,
      statut: v.statut,
    });
    window.scrollTo(0, 0);
  }

  async function supprimer(id) {
    if (!window.confirm("Supprimer ce véhicule ?")) return;
    setErreur("");
    try {
      await api(`/vehicules/${id}`, { method: "DELETE" });
      charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div>
      <h2>{editId ? `Modifier le véhicule n°${editId}` : "Nouveau véhicule"}</h2>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      <form onSubmit={enregistrer} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input name="immatriculation" placeholder="Immatriculation" value={form.immatriculation} onChange={change} required />
        <input name="marque" placeholder="Marque" value={form.marque} onChange={change} required />
        <input name="modele" placeholder="Modèle" value={form.modele} onChange={change} required />
        <input name="capacite" type="number" min="1" placeholder="Capacité" value={form.capacite} onChange={change} required />
        <select name="statut" value={form.statut} onChange={change}>
          <option value="disponible">disponible</option>
          <option value="en_service">en_service</option>
          <option value="maintenance">maintenance</option>
        </select>
        <button type="submit">{editId ? "Enregistrer" : "Créer"}</button>
        {editId && (
          <button type="button" onClick={() => { setEditId(null); setForm(VEHICULE_VIDE); }}>
            Annuler la modification
          </button>
        )}
      </form>

      <h2>Tous les véhicules</h2>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>ID</th><th>Immatriculation</th><th>Marque</th>
            <th>Modèle</th><th>Capacité</th><th>Statut</th><th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((v) => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td>{v.immatriculation}</td>
              <td>{v.marque}</td>
              <td>{v.modele}</td>
              <td>{v.capacite}</td>
              <td>{v.statut}</td>
              <td>
                <button onClick={() => modifier(v)}>Modifier</button>{" "}
                <button onClick={() => supprimer(v.id)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Réservations ---------- */
function ReservationsAdmin() {
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

/* ---------- Page ---------- */
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