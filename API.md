# API de gestion de transport

API REST (Node.js / Express / PostgreSQL) pour la réservation de trajets avec QR code.

- **URL de base** : `http://localhost:3000/api` (ou `http://IP_DU_SERVEUR:3000/api` depuis un autre poste)
- **Format** : JSON (`Content-Type: application/json`)
- **Authentification** : jeton JWT valable 2 heures, envoyé dans l'en-tête `Authorization: Bearer <token>`
- **Rôles** : `client`, `chauffeur`, `admin`

## Sommaire

1. [Santé](#1-santé)
2. [Authentification](#2-authentification)
3. [Trajets](#3-trajets)
4. [Véhicules](#4-véhicules)
5. [Réservations et QR code](#5-réservations-et-qr-code)
6. [Codes d'erreur](#6-codes-derreur)

---

## 1. Santé

### `GET /health`
Vérifie que le serveur et la base répondent. Public.

**Réponse 200**
```json
{ "status": "ok", "db_time": "2026-11-06T22:49:30.581Z" }
```

---

## 2. Authentification

### `POST /auth/register`
Crée un compte. Le rôle n'est **jamais** choisi par l'appelant : tout nouveau compte est un `client`. Un chauffeur ou un admin est promu directement en base.

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `nom` | string | oui | non vide |
| `prenom` | string | oui | non vide |
| `email` | string | oui | email valide |
| `mot_de_passe` | string | oui | 8 caractères minimum |
| `telephone` | string | non | |

**Réponse 201**
```json
{ "id": 3, "nom": "Test", "prenom": "Client", "email": "client@test.com", "role": "client" }
```

| Code | Cas |
|---|---|
| 400 | Champ invalide ou manquant |
| 409 | `{ "message": "Email déjà utilisé" }` |

### `POST /auth/login`
Connecte un utilisateur et renvoie un jeton.

| Champ | Type | Obligatoire |
|---|---|---|
| `email` | string | oui |
| `mot_de_passe` | string | oui |

**Réponse 200**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 3, "nom": "Test", "prenom": "Client", "email": "client@test.com", "role": "client" }
}
```

| Code | Cas |
|---|---|
| 400 | Champ invalide ou manquant |
| 401 | `{ "message": "Identifiants incorrects" }` |

---

## 3. Trajets

### `GET /trajets`
Liste les trajets triés par date de départ, avec le nombre de places restantes. Public.

| Paramètre de requête | Type | Obligatoire | Description |
|---|---|---|---|
| `depart` | string | non | Ville de départ (recherche partielle, insensible à la casse) |
| `arrivee` | string | non | Ville d'arrivée (recherche partielle, insensible à la casse) |
| `date` | date ISO 8601 | non | Trajets partant ce jour-là |

Exemple : `GET /trajets?depart=tunis&date=2026-11-07`

**Réponse 200** : tableau de trajets. Chaque trajet contient `places_restantes` (places totales moins les réservations non annulées).

### `GET /trajets/:id`
Détail d'un trajet. Public.

**Réponse 200**
```json
{
  "id": 2, "depart": "Tunis", "arrivee": "Sousse",
  "date_depart": "2026-11-07T22:57:16.000Z", "date_arrivee": null,
  "prix": "15.00", "places_total": 4, "places_restantes": 4,
  "statut": "planifie", "vehicule_id": null, "chauffeur_id": 2,
  "created_at": "2026-11-06T22:57:16.757Z"
}
```
Erreurs : `400` (id invalide).

### `POST /trajets`
Crée un trajet. **Rôle : admin.**

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `depart` | string | oui | non vide |
| `arrivee` | string | oui | non vide |
| `date_depart` | date ISO 8601 | oui | |
| `date_arrivee` | date ISO 8601 | non | peut être `null` |
| `prix` | nombre | oui | ≥ 0 |
| `places_total` | entier | oui | ≥ 1 |
| `vehicule_id` | entier | non | |
| `chauffeur_id` | entier | non | id d'un utilisateur chauffeur |
| `statut` | string | non | `planifie`, `en_cours`, `termine`, `annule` |

**Réponse** : le trajet créé (même forme que ci-dessus, sans `places_restantes`).
Erreurs : `400`, `401`, `403`.

### `PUT /trajets/:id`
Modifie un trajet. **Rôle : admin.** Mêmes champs que la création. Erreurs : `400`, `401`, `403`.

### `DELETE /trajets/:id`
Supprime un trajet et, par cascade en base, ses réservations. **Rôle : admin.** Erreurs : `400`, `401`, `403`.

---

## 4. Véhicules

Authentification requise pour toutes les routes.

| Méthode | Chemin | Rôles | Description |
|---|---|---|---|
| `GET` | `/vehicules` | admin, chauffeur | Liste des véhicules |
| `POST` | `/vehicules` | admin | Crée un véhicule |
| `PUT` | `/vehicules/:id` | admin | Modifie un véhicule |
| `DELETE` | `/vehicules/:id` | admin | Supprime un véhicule |

**Corps pour `POST` et `PUT`**

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `immatriculation` | string | oui | non vide |
| `marque` | string | oui | non vide |
| `modele` | string | oui | non vide |
| `capacite` | entier | oui | ≥ 1 |
| `statut` | string | non | `disponible`, `en_service`, `maintenance` |

Erreurs : `400`, `401`, `403`.

---

## 5. Réservations et QR code

Authentification requise pour toutes les routes de cette section.

### `POST /reservations`
Crée une réservation, confirmée automatiquement si le trajet est réservable et a assez de places (contrôle fait dans une transaction). Génère un QR code unique. **Rôles : client, admin.**

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `trajet_id` | entier | oui | |
| `nb_places` | entier | non | ≥ 1, 1 par défaut |

**Réponse 201**
```json
{
  "id": 4, "utilisateur_id": 3, "trajet_id": 2, "nb_places": 1,
  "statut": "confirmee", "created_at": "2026-11-06T22:57:16.834Z",
  "qr_code": "327a9d7b2b5a5e3d2c726948cb67e7ee",
  "qr_image": "data:image/png;base64,iVBORw0KGgo..."
}
```
`qr_code` est un identifiant de 32 caractères hexadécimaux ; `qr_image` est l'image du QR en data URL, affichable directement dans une balise `<img>`.

| Code | Cas |
|---|---|
| 400 | Données invalides, ou `{ "message": "Ce trajet n'est plus réservable" }` (statut différent de `planifie`) |
| 401 / 403 | Non connecté / rôle non autorisé |
| 404 | `{ "message": "Trajet introuvable" }` |
| 409 | `{ "message": "Plus assez de places disponibles" }` |

### `GET /reservations/mine`
Historique des réservations de l'utilisateur connecté, de la plus récente à la plus ancienne. Tous rôles.

**Réponse 200**
```json
[
  {
    "id": 4, "utilisateur_id": 3, "trajet_id": 2, "nb_places": 1,
    "statut": "confirmee", "utilise": true,
    "created_at": "2026-11-06T22:57:16.834Z",
    "depart": "Tunis", "arrivee": "Sousse",
    "date_depart": "2026-11-07T22:57:16.000Z", "prix": "15.00"
  }
]
```
`utilise` vaut `true` une fois le QR code scanné par le chauffeur.

### `GET /reservations`
Toutes les réservations, de la plus récente à la plus ancienne. **Rôle : admin.**

**Réponse 200** : tableau de réservations, même forme que `/reservations/mine`.

### `GET /reservations/chauffeur`
Réservations des trajets du chauffeur connecté (l'admin voit tout), triées par date de départ. **Rôles : chauffeur, admin.**

**Réponse 200**
```json
[
  {
    "id": 4, "nb_places": 1, "statut": "confirmee", "utilise": false,
    "created_at": "2026-11-06T22:57:16.834Z",
    "trajet_id": 2, "depart": "Tunis", "arrivee": "Sousse",
    "date_depart": "2026-11-07T22:57:16.000Z",
    "nom": "Test", "prenom": "Client", "telephone": null
  }
]
```

### `GET /reservations/:id/qr`
Renvoie le QR code d'une réservation **appartenant à l'utilisateur connecté** (pour l'afficher au client).

**Réponse 200**
```json
{ "qr_code": "327a9d7b...", "utilise": false, "statut": "confirmee", "qr_image": "data:image/png;base64,..." }
```
Erreurs : `400` (id invalide), `404` `{ "message": "Réservation introuvable" }` (inexistante ou appartenant à quelqu'un d'autre).

### `PATCH /reservations/:id/annuler`
Annule une réservation (statut `annulee`, les places sont libérées). Un client annule les siennes, l'admin peut annuler n'importe laquelle. Une réservation déjà utilisée ne peut plus être annulée.

**Réponse 200**
```json
{ "id": 4, "statut": "annulee" }
```
Erreurs : `400` (id invalide), `404` `{ "message": "Réservation introuvable ou déjà utilisée" }`.

### `POST /reservations/scan`
Vérifie un QR code présenté par un client et valide l'embarquement. **Rôles : chauffeur, admin.** Un chauffeur ne peut scanner que les réservations de **ses** trajets. Un QR code n'est accepté qu'une seule fois.

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `code` | string | oui | 32 caractères hexadécimaux (le `qr_code` de la réservation) |

**Réponse 200 : QR valide**
```json
{
  "valide": true,
  "message": "Réservation valide",
  "client": "Client Test",
  "nb_places": 1,
  "trajet": { "depart": "Tunis", "arrivee": "Sousse", "date_depart": "2026-11-07T22:57:16.000Z" }
}
```

| Code | Réponse |
|---|---|
| 400 | Format du code invalide |
| 403 | `{ "valide": false, "message": "Ce trajet n'est pas le vôtre" }` |
| 404 | `{ "valide": false, "message": "QR Code inconnu" }` |
| 409 | `{ "valide": false, "message": "Réservation annulée" }` |
| 409 | `{ "valide": false, "message": "Trajet annulé" }` |
| 409 | `{ "valide": false, "message": "QR Code déjà utilisé" }` |

---

## 6. Codes d'erreur

| Code | Signification |
|---|---|
| 400 | Données invalides (validation des champs) |
| 401 | Jeton absent, invalide ou expiré, ou identifiants incorrects |
| 403 | Rôle insuffisant pour cette action |
| 404 | Ressource ou route introuvable (`{ "message": "Route introuvable" }`) |
| 409 | Conflit (email déjà utilisé, plus de places, QR déjà utilisé ou annulé) |
| 500 | Erreur serveur |

