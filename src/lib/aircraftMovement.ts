import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';
import { AircraftState, BehaviorUpdate, createInitialBehavior, updateBehavior } from './aircraftBehavior';

interface Position {
  lon: number;
  lat: number;
  timestamp: number;
}

export interface Aircraft {
  position: Position;
  positionHistory: Position[];  // Most recent positions first
  altitude: number;  // feet
  heading: number;   // true heading
  groundSpeed: number; // knots
  type: string;     // aircraft type (e.g., PA28)
  squawk: string;   // transponder code
  behavior: {
    state: AircraftState;
    data: any;      // State-specific data managed by behavior system
  };
}

const MAX_HISTORY_LENGTH = 10; // Number of historical positions to keep

export function updateAircraftPosition(aircraft: Aircraft, elapsedSeconds: number): Aircraft {
  // Update behavior first
  const [newBehaviorData, behaviorUpdate] = updateBehavior(
    {
      ...aircraft.behavior.data,
      position: {
        lon: aircraft.position.lon,
        lat: aircraft.position.lat
      }
    },
    aircraft.heading,
    aircraft.altitude,
    elapsedSeconds
  );

  // Apply behavior updates
  let updatedAircraft = { ...aircraft };
  
  // Update heading if specified
  if (behaviorUpdate.newHeading !== undefined) {
    updatedAircraft.heading = behaviorUpdate.newHeading;
  }
  
  // Update altitude if specified
  if (behaviorUpdate.newAltitude !== undefined) {
    updatedAircraft.altitude = behaviorUpdate.newAltitude;
  }
  
  // Update ground speed if specified
  if (behaviorUpdate.newGroundSpeed !== undefined) {
    updatedAircraft.groundSpeed = behaviorUpdate.newGroundSpeed;
  }
  
  // Update state if specified
  if (behaviorUpdate.newState !== undefined) {
    updatedAircraft.behavior.state = behaviorUpdate.newState;
  }
  
  updatedAircraft.behavior.data = newBehaviorData;

  // Calculate new position based on current heading and speed
  const distanceNM = (updatedAircraft.groundSpeed * elapsedSeconds) / 3600;
  const newPosition = turf.destination(
    turf.point([updatedAircraft.position.lon, updatedAircraft.position.lat]),
    distanceNM,
    updatedAircraft.heading,
    { units: 'nauticalmiles' as Units }
  );

  const currentTime = Date.now();
  const newPositionData: Position = {
    lon: newPosition.geometry.coordinates[0],
    lat: newPosition.geometry.coordinates[1],
    timestamp: currentTime
  };

  // Add current position to history and maintain history length
  const updatedHistory = [
    updatedAircraft.position,
    ...updatedAircraft.positionHistory
  ].slice(0, MAX_HISTORY_LENGTH);

  return {
    ...updatedAircraft,
    position: newPositionData,
    positionHistory: updatedHistory
  };
}

// Initial aircraft setup
export function createTestAircraft(referencePoint: [number, number]): Aircraft {
  // Position 15nm east of reference point
  const initialPosition = turf.destination(
    turf.point(referencePoint),
    15,
    90, // East
    { units: 'nauticalmiles' as Units }
  );

  const currentTime = Date.now();
  const initialPositionData: Position = {
    lon: initialPosition.geometry.coordinates[0],
    lat: initialPosition.geometry.coordinates[1],
    timestamp: currentTime
  };

  // Create initial behavior state with position
  const initialBehavior = createInitialBehavior();
  initialBehavior.position = {
    lon: initialPositionData.lon,
    lat: initialPositionData.lat
  };

  return {
    position: initialPositionData,
    positionHistory: [], // Start with empty history
    altitude: 1500,
    heading: 360, // North
    groundSpeed: 95,
    type: 'PA28',
    squawk: '4200',
    behavior: {
      state: AircraftState.CRUISE,
      data: initialBehavior
    }
  };
} 