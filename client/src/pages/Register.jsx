import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function Register() {
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    mot_de_passe: "",
    telephone: "",
  });
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate();

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur("");
    try {
      await api("/auth/register", { method: "POST", body: form });
      navigate("/login");
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Inscription</h1>
      <input name="nom" placeholder="Nom" value={form.nom} onChange={change} required />
      <input name="prenom" placeholder="Prénom" value={form.prenom} onChange={change} required />
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={change} required />
      <input
        name="mot_de_passe"
        type="password"
        placeholder="Mot de passe (8 caractères min.)"
        value={form.mot_de_passe}
        onChange={change}
        minLength={8}
        required
      />
      <input name="telephone" placeholder="Téléphone (optionnel)" value={form.telephone} onChange={change} />
      <button type="submit">Créer mon compte</button>
      {erreur && <p style={{ color: "red" }}>{erreur}</p>}
      <p>
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </form>
  );
}
