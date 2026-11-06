#!/usr/bin/env bash
BASE=http://localhost:3000/api
PW='Test12345'
tok() { curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"mot_de_passe\":\"$PW\"}" | jq -r .token; }
call() { # nom, attendu, méthode, chemin, jeton, json
  out=$(curl -s -w "\n%{http_code}" -X "$3" "$BASE$4" -H "Content-Type: application/json" \
    ${5:+-H "Authorization: Bearer $5"} ${6:+-d "$6"})
  printf "%-48s attendu %s  obtenu %s\n" "$1" "$2" "$(echo "$out" | tail -n1)"
}
ADMIN=$(tok admin@test.com); CLIENT=$(tok client@test.com); CH=$(tok chauffeur@test.com)
ZERO='00000000000000000000000000000000'

call "B1 Mauvais mot de passe" 401 POST /auth/login "" '{"email":"client@test.com","mot_de_passe":"faux12345"}'
call "B2 Sans jeton" 401 GET /reservations/mine
call "B3 Client crée un trajet" 403 POST /trajets "$CLIENT" '{"depart":"A","arrivee":"B","date_depart":"2026-12-01T10:00:00Z","prix":5,"places_total":2}'
call "B4 Client scanne un QR" 403 POST /reservations/scan "$CLIENT" "{\"code\":\"$ZERO\"}"
call "B5 Scan format invalide" 400 POST /reservations/scan "$CH" '{"code":"abc"}'
call "B6 Scan code inconnu" 404 POST /reservations/scan "$CH" "{\"code\":\"$ZERO\"}"
call "B7 Trajet inexistant" 404 POST /reservations "$CLIENT" '{"trajet_id":99999}'
call "B8 Trop de places" 409 POST /reservations "$CLIENT" '{"trajet_id":2,"nb_places":50}'
call "B9 Annuler une réservation utilisée" 404 PATCH /reservations/4/annuler "$CLIENT"

NEW=$(curl -s -X POST $BASE/reservations -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLIENT" -d '{"trajet_id":2}')
ID=$(echo "$NEW" | jq -r .id); CODE=$(echo "$NEW" | jq -r .qr_code)
call "B10 Annulation d'une réservation neuve" 200 PATCH /reservations/$ID/annuler "$CLIENT"
call "B11 Scan d'une réservation annulée" 409 POST /reservations/scan "$CH" "{\"code\":\"$CODE\"}"
