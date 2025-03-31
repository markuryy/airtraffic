import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { StoredFlightPlan } from '@/types/flightPlan';
import airportList from '@/data/airport-list.json';

// Fix for default marker icons in Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const planeIcon = L.divIcon({
  className: 'plane-icon',
  html: '✈️',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface Position {
  lat: number;
  lon: number;
  altitude: number;
  timestamp: number;
}

interface ActiveFlight extends StoredFlightPlan {
  position?: Position;
  completed?: boolean;
}

interface FlightMapProps {
  activeFlights: ActiveFlight[];
}

export default function FlightMap({ activeFlights }: FlightMapProps) {
  // Calculate map bounds to fit all airports
  const bounds = L.latLngBounds(airportList.airports.map(airport => [airport.lat, airport.lon]));
  
  // Add some padding to the bounds
  bounds.pad(0.2);

  return (
    <MapContainer
      bounds={bounds}
      style={{ height: '400px', width: '100%', marginBottom: '2rem' }}
      className="dark-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      {/* Render airports */}
      {airportList.airports.map(airport => (
        <Marker
          key={airport.id}
          position={[airport.lat, airport.lon]}
          icon={icon}
        >
          <Popup className="dark-popup">
            <strong>{airport.id}</strong><br />
            {airport.name}
          </Popup>
        </Marker>
      ))}

      {/* Render active flights */}
      {activeFlights.map(flight => {
        if (!flight.departure || !flight.destination) return null;

        // Draw route line
        const routeCoords = [
          [flight.departure.lat, flight.departure.lon],
          [flight.destination.lat, flight.destination.lon]
        ] as [number, number][];

        return (
          <div key={flight.id}>
            <Polyline
              positions={routeCoords}
              color={flight.completed ? "#4ade80" : flight.position ? "#60a5fa" : "#6b7280"}
              weight={2}
              opacity={0.8}
            />
            
            {/* Show aircraft position if active */}
            {flight.position && (
              <Marker
                position={[flight.position.lat, flight.position.lon]}
                icon={planeIcon}
              >
                <Popup className="dark-popup">
                  <strong>{flight.aircraft?.id}</strong><br />
                  {flight.departure.id} → {flight.destination.id}<br />
                  Altitude: {flight.position.altitude}ft
                </Popup>
              </Marker>
            )}
          </div>
        );
      })}
    </MapContainer>
  );
} 