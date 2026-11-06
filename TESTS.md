# Scénario de test : API de gestion de transport

## Contexte

| Élément | Valeur |
|---|---|
| Date des tests | 6 novembre 2026 |
| Serveur | Node.js / Express, `npm run dev`, port 3000 |
| Base de données | PostgreSQL 17 sur une VM Ubuntu (VMware, mode Bridged) |
| Comptes de test | `admin@test.com` (admin), `chauffeur@test.com` (chauffeur), `client@test.com` (client) |
| Scripts | `test-qr.sh` (scénario nominal), `test-erreurs.sh` (cas d'erreur) |

Les comptes de test utilisent un mot de passe d'essai, à changer ou à supprimer avant la démonstration finale.

## Partie A : scénario nominal (client, chauffeur, système)

Exécuté avec `./test-qr.sh`.

| N° | Test | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|
| A1 | `GET /api/health` | `status: ok` et l'heure de la base | `{"status":"ok","db_time":"2026-11-06T22:49:30.581Z"}` | OK |
| A2 | Inscription d'un client (`POST /auth/register`) | Compte créé avec le rôle `client` | Compte créé (id 3, rôle `client`) | OK |
| A3 | Inscription avec un email déjà utilisé | Refus, message « Email déjà utilisé » | `{"message":"Email déjà utilisé"}` | OK |
| A4 | Connexion admin, chauffeur et client (`POST /auth/login`) | Un jeton JWT par compte | Trois jetons reçus | OK |
| A5 | Création d'un trajet Tunis → Sousse par l'admin, affecté au chauffeur | Trajet créé, statut `planifie` | Trajet créé (id 2, 4 places, 15 TND, `chauffeur_id` 2) | OK |
| A6 | Réservation du trajet par le client (`POST /reservations`) | Réservation `confirmee` avec `qr_code` et `qr_image` | Réservation id 4, `confirmee`, QR de 32 caractères et image générés | OK |
| A7 | Premier scan par le chauffeur (`POST /reservations/scan`) | HTTP 200, `valide: true`, infos du client et du trajet | HTTP 200, « Réservation valide », client « Client Test », trajet Tunis → Sousse | OK |
| A8 | Second scan du même QR | HTTP 409, « QR Code déjà utilisé » | HTTP 409, `{"valide":false,"message":"QR Code déjà utilisé"}` | OK |
| A9 | Historique du client (`GET /reservations/mine`) | Réservation 4 avec `utilise: true` | Réservation 4 avec `utilise: true`, trajet et prix inclus | OK |
| A10 | Vue du chauffeur (`GET /reservations/chauffeur`) | Réservations de ses trajets avec nom du client, triées par date | 4 réservations (trajets 2 et 1), `utilise: true` pour la réservation 4 | OK |

## Partie B : cas d'erreur et droits

Exécuté avec `./test-erreurs.sh` le 6 novembre 2026. Les 11 codes HTTP obtenus correspondent aux codes attendus.

| N° | Test | Résultat attendu | Résultat obtenu | Statut |
|---|---|---|---|---|
| B1 | Connexion avec un mauvais mot de passe | HTTP 401 | HTTP 401 | OK |
| B2 | `GET /reservations/mine` sans jeton | HTTP 401 | HTTP 401 | OK |
| B3 | Un client tente de créer un trajet | HTTP 403 | HTTP 403 | OK |
| B4 | Un client tente de scanner un QR | HTTP 403 | HTTP 403 | OK |
| B5 | Scan d'un code de format invalide (`abc`) | HTTP 400 | HTTP 400 | OK |
| B6 | Scan d'un code inconnu | HTTP 404 | HTTP 404 | OK |
| B7 | Réservation d'un trajet inexistant | HTTP 404 | HTTP 404 | OK |
| B8 | Réservation de 50 places sur un trajet de 4 | HTTP 409, « Plus assez de places disponibles » | HTTP 409 | OK |
| B9 | Annulation d'une réservation déjà utilisée | HTTP 404, « Réservation introuvable ou déjà utilisée » | HTTP 404 | OK |
| B10 | Annulation d'une réservation neuve par son client | HTTP 200, statut `annulee` | HTTP 200 | OK |
| B11 | Scan d'une réservation annulée | HTTP 409, « Réservation annulée » | HTTP 409 | OK |

## Conclusion

Le flux principal (inscription, connexion, création d'un trajet, réservation avec QR code, scan par le chauffeur, refus du second scan, consultation des réservations) est validé. Les 11 cas d'erreur et de droits de la partie B donnent les codes attendus : authentification refusée sans jeton ou avec un mauvais mot de passe, accès interdit selon le rôle, validation des entrées, contrôle des places, annulation et scan d'une réservation annulée. Aucune anomalie n'a été relevée.

