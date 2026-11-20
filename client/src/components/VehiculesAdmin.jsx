import { useEffect, useState } from "react";
import { api } from "../services/api";

const VIDE = {
  immatriculation: "", marque: "", modele: "", capacite: "", statut: "disponible",
};

export default function VehiculesAdmin() {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState(VIDE);
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
      setForm(VIDE);
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
          <button type="button" onClick={() => { setEditId(null); setForm(VIDE); }}>
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
