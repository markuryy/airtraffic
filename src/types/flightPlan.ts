export interface AircraftType {
  id: string;
  label: string;
  cruiseSpeed: number;
}

export interface Airport {
  id: string;
  label: string;
  name: string;
  lat: number;
  lon: number;
}

export interface FlightPlan {
  aircraft: AircraftType | null;
  speed: string;
  altitude: string;
  fuel: string;
  departure: Airport | null;
  destination: Airport | null;
  etdTime: string;
  etdDate: string;
  waypoints: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface StoredFlightPlan extends FlightPlan {
  id: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
} 