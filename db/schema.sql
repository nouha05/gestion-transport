CREATE TABLE utilisateurs (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  telephone VARCHAR(30),
  role VARCHAR(20) NOT NULL DEFAULT 'client'
    CHECK (role IN ('admin', 'chauffeur', 'client')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicules (
  id SERIAL PRIMARY KEY,
  immatriculation VARCHAR(20) NOT NULL UNIQUE,
  marque VARCHAR(50) NOT NULL,
  modele VARCHAR(50) NOT NULL,
  capacite INT NOT NULL CHECK (capacite > 0),
  statut VARCHAR(20) NOT NULL DEFAULT 'disponible'
    CHECK (statut IN ('disponible', 'en_service', 'maintenance')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE trajets (
  id SERIAL PRIMARY KEY,
  depart VARCHAR(100) NOT NULL,
  arrivee VARCHAR(100) NOT NULL,
  date_depart TIMESTAMP NOT NULL,
  date_arrivee TIMESTAMP,
  prix NUMERIC(8,2) NOT NULL CHECK (prix >= 0),
  places_total INT NOT NULL CHECK (places_total > 0),
  statut VARCHAR(20) NOT NULL DEFAULT 'planifie'
    CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule')),
  vehicule_id INT REFERENCES vehicules(id) ON DELETE SET NULL,
  chauffeur_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  utilisateur_id INT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  trajet_id INT NOT NULL REFERENCES trajets(id) ON DELETE CASCADE,
  nb_places INT NOT NULL DEFAULT 1 CHECK (nb_places > 0),
  statut VARCHAR(20) NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'confirmee', 'annulee')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trajets_date ON trajets(date_depart);
CREATE INDEX idx_reservations_user ON reservations(utilisateur_id);
CREATE INDEX idx_reservations_trajet ON reservations(trajet_id);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO colleague;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO colleague;
