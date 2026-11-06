#!/usr/bin/env bash
BASE=http://localhost:3000/api
PW='Test12345'
ADMIN_PW="${ADMIN_PW:-Test12345}"

req() { # méthode, chemin, token, json
  curl -s -X "$1" "$BASE$2" -H "Content-Type: application/json" \
    ${3:+-H "Authorization: Bearer $3"} ${4:+-d "$4"}
}
login() { req POST /auth/login "" "{\"email\":\"$1\",\"mot_de_passe\":\"$2\"}"; }

echo "== 1. Création des comptes de test (409 = déjà existants)"
req POST /auth/register "" "{\"nom\":\"Test\",\"prenom\":\"Client\",\"email\":\"client@test.com\",\"mot_de_passe\":\"$PW\"}"; echo
req POST /auth/register "" "{\"nom\":\"Test\",\"prenom\":\"Chauffeur\",\"email\":\"chauffeur@test.com\",\"mot_de_passe\":\"$PW\"}"; echo

echo "== 2. Promotion du chauffeur"
sudo -u postgres psql -d transport_db -c "UPDATE utilisateurs SET role='chauffeur' WHERE email='chauffeur@test.com';"

echo "== 3. Connexions"
ADMIN_TOKEN=$(login admin@test.com "$ADMIN_PW" | jq -r .token)
CLIENT_TOKEN=$(login client@test.com "$PW" | jq -r .token)
CH=$(login chauffeur@test.com "$PW")
CH_TOKEN=$(echo "$CH" | jq -r .token)
CH_ID=$(echo "$CH" | jq -r .user.id)
for t in "$ADMIN_TOKEN" "$CLIENT_TOKEN" "$CH_TOKEN"; do
  [ "$t" = "null" ] || [ -z "$t" ] && { echo "Échec de connexion, arrêt."; exit 1; }
done
echo "OK (chauffeur id = $CH_ID)"

echo "== 4. Création d'un trajet par l'admin"
DATE=$(date -d "+1 day" -Iseconds)
TRAJET=$(req POST /trajets "$ADMIN_TOKEN" "$(jq -n --arg d "$DATE" --argjson c "$CH_ID" \
  '{depart:"Tunis",arrivee:"Sousse",date_depart:$d,prix:15,places_total:4,chauffeur_id:$c}')")
echo "$TRAJET"
TRAJET_ID=$(echo "$TRAJET" | jq -r .id)

echo "== 5. Réservation par le client"
RES=$(req POST /reservations "$CLIENT_TOKEN" "{\"trajet_id\":$TRAJET_ID,\"nb_places\":1}")
echo "$RES" | cut -c1-300

echo "== 6. Récupération du code QR en base"
CODE=$(sudo -u postgres psql -d transport_db -tA -c \
 "SELECT r.qr_code FROM reservations r JOIN utilisateurs u ON u.id=r.utilisateur_id
  WHERE u.email='client@test.com' ORDER BY r.id DESC LIMIT 1;")
echo "code = $CODE"

echo "== 7. Premier scan (doit être accepté)"
curl -s -w "\n[HTTP %{http_code}]\n" -X POST "$BASE/reservations/scan" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CH_TOKEN" -d "{\"code\":\"$CODE\"}"

echo "== 8. Second scan (doit être refusé)"
curl -s -w "\n[HTTP %{http_code}]\n" -X POST "$BASE/reservations/scan" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $CH_TOKEN" -d "{\"code\":\"$CODE\"}"
