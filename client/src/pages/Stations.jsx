import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BusFront, Clock3, MapPin, Search } from "lucide-react";
import Navbar from "../components/Navbar";
import { api } from "../services/api";
import { STATION_CITIES } from "../data/stationCities";

function cityKey(city) {
  return city.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatTime(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StationMap({ stations, onSelect, selectedCity }) {
  const mapElement = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (!mapElement.current) return undefined;

    const leafletMap = L.map(mapElement.current, {
      scrollWheelZoom: false,
    }).setView([34.1, 9.5], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMap);

    map.current = leafletMap;

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      leafletMap.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((marker) => marker.remove());
    markers.current = stations
      .filter((station) => station.lat !== null && station.lng !== null)
      .map((station) => {
        const marker = L.marker([station.lat, station.lng], {
          title: station.city,
          icon: L.divIcon({
            className: "",
            html: `<span class="station-map-marker${station.city === selectedCity ? " is-selected" : ""}"><span>${station.departures.length}</span></span>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        }).addTo(map.current);
        marker.on("click", () => onSelect(station.city));
        return marker;
      });
  }, [stations, onSelect, selectedCity]);

  useEffect(() => {
    const station = stations.find((item) => item.city === selectedCity);
    if (station && station.lat !== null && map.current) {
      map.current.flyTo([station.lat, station.lng], Math.max(map.current.getZoom(), 8), {
        duration: 0.6,
      });
    }
  }, [selectedCity, stations]);

  return <div className="station-map" ref={mapElement} aria-label="Carte interactive des stations de bus en Tunisie" />;
}

export default function Stations() {
  const [trajets, setTrajets] = useState([]);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [selectedCity, setSelectedCity] = useState(null);
  const [now, setNow] = useState(0);
  const selectCity = useCallback((city) => setSelectedCity(city), []);

  useEffect(() => {
    api("/trajets")
      .then((data) => {
        setTrajets(data);
        setNow(Date.now());
      })
      .catch((error) => setErreur(error.message))
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const stations = useMemo(() => {
    const cutoff = now + 24 * 60 * 60 * 1000;
    const departuresByCity = new Map();
    const cityLabels = new Map(STATION_CITIES.map((station) => [cityKey(station.city), station.city]));

    for (const trajet of trajets) {
      for (const city of [trajet.depart, trajet.arrivee]) {
        if (city?.trim()) {
          const key = cityKey(city);
          cityLabels.set(key, cityLabels.get(key) || city.trim());
        }
      }

      const departure = new Date(trajet.date_depart);
      if (
        trajet.statut !== "planifie"
        || Number.isNaN(departure.getTime())
        || departure.getTime() < now
        || departure.getTime() > cutoff
      ) {
        continue;
      }

      const key = cityKey(trajet.depart);
      departuresByCity.set(key, [...(departuresByCity.get(key) || []), departure]);
    }

    return [...cityLabels.entries()]
      .map(([key, city]) => {
        const location = STATION_CITIES.find((station) => cityKey(station.city) === key);
        const departures = (departuresByCity.get(key) || []).sort((a, b) => a - b);
        return {
          city,
          region: location?.region || "Ville présente dans les trajets",
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          departures,
        };
      })
      .sort((a, b) => a.city.localeCompare(b.city, "fr"));
  }, [trajets, now]);

  const stationsFiltrees = stations.filter((station) =>
    station.city.toLocaleLowerCase("fr").includes(recherche.toLocaleLowerCase("fr"))
  );
  const stationSelectionnee = stations.find((station) => station.city === selectedCity);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page station-page">
        <div className="page-heading">
          <div>
            <h1>Stations de bus</h1>
            <p>Explorez les stations et les prochains départs en Tunisie.</p>
          </div>
        </div>

        {erreur && <div className="alert" role="alert">{erreur}</div>}

        <section className="station-panel panel">
          <div className="station-map-wrap">
            <StationMap
              stations={stations}
              onSelect={selectCity}
              selectedCity={selectedCity}
            />
            <div className="station-map-note">
              <MapPin size={15} />
              Emplacements approximatifs au centre des villes
            </div>
          </div>

          <aside className="station-sidebar">
            <div className="station-sidebar-heading">
              <div>
                <h2>Stations</h2>
                <p>{stations.length} villes</p>
              </div>
              <BusFront size={20} aria-hidden="true" />
            </div>

            <label className="station-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                placeholder="Rechercher une ville"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                aria-label="Rechercher une station par ville"
              />
            </label>

            {stationSelectionnee && (
              <div className="station-detail" aria-live="polite">
                <span className="station-region">
                  {stationSelectionnee.lat === null
                    ? "Emplacement à préciser"
                    : stationSelectionnee.region}
                </span>
                <h3>{stationSelectionnee.city}</h3>
                <div className="station-detail-stats">
                  <div>
                    <BusFront size={16} />
                    <strong>{stationSelectionnee.departures.length}</strong>
                    <span>départ(s) dans 24 h</span>
                  </div>
                  <div>
                    <Clock3 size={16} />
                    <strong>
                      {stationSelectionnee.departures.length
                        ? formatTime(stationSelectionnee.departures[0])
                        : "—"}
                    </strong>
                    <span>premier départ</span>
                  </div>
                </div>
                {stationSelectionnee.departures.length === 0 && (
                  <p className="station-no-departure">
                    Aucun départ planifié dans les prochaines 24 heures.
                  </p>
                )}
              </div>
            )}

            <div className="station-list" aria-label="Liste des stations">
              {stationsFiltrees.map((station) => (
                <button
                  type="button"
                  className={`station-list-item${station.city === selectedCity ? " is-active" : ""}`}
                  key={station.city}
                  onClick={() => selectCity(station.city)}
                >
                  <span className="station-list-pin"><MapPin size={16} /></span>
                  <span className="station-list-name">
                    <strong>{station.city}</strong>
                    <small>
                      {station.departures.length
                        ? `Premier départ à ${formatTime(station.departures[0])}`
                        : "Aucun départ dans 24 h"}
                    </small>
                  </span>
                  <span className="station-list-count">{station.departures.length}</span>
                </button>
              ))}
              {stationsFiltrees.length === 0 && (
                <p className="station-empty">Aucune ville ne correspond à la recherche.</p>
              )}
            </div>
          </aside>
        </section>

        <p className="station-data-note">
          {chargement
            ? "Chargement des horaires..."
            : "Les nombres indiquent les trajets planifiés dans l’application pour les prochaines 24 heures, pas les bus physiquement présents. La carte couvre les principaux pôles régionaux ; les autres villes issues des trajets apparaissent dans la liste, sans coordonnées tant qu’elles ne sont pas renseignées."}
        </p>
      </main>
    </div>
  );
}
