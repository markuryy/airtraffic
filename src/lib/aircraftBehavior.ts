import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';
import seedrandom from 'seedrandom';
import airportData from '@/data/airports.json';

// Aircraft behavior states
export enum AircraftState {
  CRUISE = 'CRUISE',
  TURNING = 'TURNING',
  CLIMBING = 'CLIMBING',
  DESCENDING = 'DESCENDING',
  APPROACH_TRANSIT = 'APPROACH_TRANSIT',  // Moving to approach fix
  FINAL_APPROACH = 'FINAL_APPROACH'       // On final approach
}

interface StateTransition {
  nextState: AircraftState;
  probability: number;
}

interface RunwayApproach {
  airport: string;
  runway: {
    id: string;
    heading: number;
    elevation: number;  // feet MSL
    threshold: {
      lat: number;
      lon: number;
    };
  };
  approachFix: {
    lat: number;
    lon: number;
    altitude: number;  // feet MSL
  };
}

interface BehaviorState {
  currentState: AircraftState;
  targetHeading?: number;    // For turns
  targetAltitude?: number;   // For climbs/descents
  stateStartTime: number;    // When this state began
  rng: seedrandom.PRNG;     // Seeded random number generator
  approachPlan?: RunwayApproach;  // Current approach plan if landing
  position: {
    lon: number;
    lat: number;
  };
}

export interface BehaviorUpdate {
  newHeading?: number;      // New heading if turning
  newAltitude?: number;     // New altitude if climbing/descending
  newState?: AircraftState; // New state if state changed
  newGroundSpeed?: number;  // New ground speed if changing speed
}

const STANDARD_TURN_RATE = 3; // 3 degrees per second
const DEFAULT_SEED = 'kbuf-traffic';

// Constants for approach planning
const DESCENT_GRADIENT = 3;  // nautical miles per 1000ft
const DESCENT_RATE = 500;    // feet per minute
const APPROACH_SPEED = 90;   // knots
const FIELD_ELEVATION = 728; // KBUF field elevation in feet MSL
const CIRCUIT_ALTITUDE = 1000; // feet above field elevation

// Markov chain transition probabilities from each state
const stateTransitions: Record<AircraftState, StateTransition[]> = {
  [AircraftState.CRUISE]: [
    { nextState: AircraftState.CRUISE, probability: 0.95 },
    { nextState: AircraftState.TURNING, probability: 0.05 }
  ],
  [AircraftState.TURNING]: [
    { nextState: AircraftState.CRUISE, probability: 0.1 },
    { nextState: AircraftState.TURNING, probability: 0.9 }
  ],
  [AircraftState.CLIMBING]: [
    { nextState: AircraftState.CRUISE, probability: 0.2 },
    { nextState: AircraftState.CLIMBING, probability: 0.8 }
  ],
  [AircraftState.DESCENDING]: [
    { nextState: AircraftState.CRUISE, probability: 0.2 },
    { nextState: AircraftState.DESCENDING, probability: 0.8 }
  ],
  [AircraftState.APPROACH_TRANSIT]: [
    { nextState: AircraftState.APPROACH_TRANSIT, probability: 1.0 }
  ],
  [AircraftState.FINAL_APPROACH]: [
    { nextState: AircraftState.FINAL_APPROACH, probability: 1.0 }
  ]
};

function calculateApproachFix(runway: any, altitude: number): [number, number, number] {
  const altitudeAboveField = altitude - FIELD_ELEVATION;
  const distanceRequired = (altitudeAboveField / 1000) * DESCENT_GRADIENT;
  
  // Calculate approach fix position
  const approachPoint = turf.destination(
    turf.point([runway.start.lon, runway.start.lat]),
    distanceRequired,
    (runway.heading + 180) % 360, // Opposite of runway heading
    { units: 'nauticalmiles' as Units }
  );

  return [
    approachPoint.geometry.coordinates[0],
    approachPoint.geometry.coordinates[1],
    altitude
  ];
}

function planApproach(currentAltitude: number, rng: seedrandom.PRNG): RunwayApproach {
  // Randomly select between KBUF and KIAG
  const airports = ['KBUF', 'KIAG'] as const;
  const selectedAirport = airports[Math.floor(rng() * airports.length)];
  const runway = airportData[selectedAirport].runways[0];

  const [fixLon, fixLat, fixAlt] = calculateApproachFix(runway, currentAltitude);

  return {
    airport: selectedAirport,
    runway: {
      id: runway.id,
      heading: runway.heading,
      elevation: FIELD_ELEVATION,
      threshold: {
        lat: runway.start.lat,
        lon: runway.start.lon
      }
    },
    approachFix: {
      lat: fixLat,
      lon: fixLon,
      altitude: fixAlt
    }
  };
}

export function createInitialBehavior(seed: string = DEFAULT_SEED): BehaviorState {
  return {
    currentState: AircraftState.CRUISE,
    stateStartTime: Date.now(),
    rng: seedrandom(seed),
    position: {
      lon: 0,
      lat: 0
    }
  };
}

function selectNextState(currentState: AircraftState, rng: seedrandom.PRNG): AircraftState {
  const transitions = stateTransitions[currentState];
  const random = rng();
  let cumulativeProbability = 0;

  for (const transition of transitions) {
    cumulativeProbability += transition.probability;
    if (random < cumulativeProbability) {
      return transition.nextState;
    }
  }

  return currentState; // Fallback to current state
}

function calculateNewHeading(currentHeading: number, targetHeading: number, elapsedSeconds: number): number {
  const turnAmount = STANDARD_TURN_RATE * elapsedSeconds;
  const headingDiff = ((targetHeading - currentHeading + 540) % 360) - 180;
  
  if (Math.abs(headingDiff) <= turnAmount) {
    return targetHeading;
  }
  
  return (currentHeading + Math.sign(headingDiff) * turnAmount + 360) % 360;
}

export function updateBehavior(
  behaviorState: BehaviorState,
  currentHeading: number,
  currentAltitude: number,
  elapsedSeconds: number
): [BehaviorState, BehaviorUpdate] {
  const currentTime = Date.now();
  const stateElapsedTime = currentTime - behaviorState.stateStartTime;
  const update: BehaviorUpdate = {};

  // Only check for random state transitions if we're in CRUISE state
  if (stateElapsedTime >= 5000 && behaviorState.currentState === AircraftState.CRUISE) {
    const nextState = selectNextState(behaviorState.currentState, behaviorState.rng);
    
    if (nextState !== behaviorState.currentState) {
      update.newState = nextState;
      behaviorState = {
        ...behaviorState,
        currentState: nextState,
        stateStartTime: currentTime
      };

      // Initialize new state parameters
      if (nextState === AircraftState.TURNING) {
        // Choose a new random heading (multiples of 10 degrees)
        const newTarget = Math.floor(behaviorState.rng() * 36) * 10;
        behaviorState.targetHeading = newTarget;
      } else if (nextState === AircraftState.APPROACH_TRANSIT) {
        // Plan the approach
        behaviorState.approachPlan = planApproach(currentAltitude, behaviorState.rng);
        
        // Calculate bearing to approach fix
        const approachFix = behaviorState.approachPlan.approachFix;
        const currentPos = turf.point([behaviorState.position.lon, behaviorState.position.lat]);
        const bearingToFix = turf.bearing(
          currentPos,
          turf.point([approachFix.lon, approachFix.lat])
        );
        
        // Set up approach parameters
        behaviorState.targetHeading = bearingToFix;
        behaviorState.targetAltitude = approachFix.altitude;
        update.newGroundSpeed = APPROACH_SPEED;
      }
    }
  }

  // Apply state-specific behavior
  switch (behaviorState.currentState) {
    case AircraftState.TURNING:
      if (behaviorState.targetHeading !== undefined) {
        const newHeading = calculateNewHeading(currentHeading, behaviorState.targetHeading, elapsedSeconds);
        update.newHeading = newHeading;
        
        // Only transition if we've exactly reached the target heading
        if (newHeading === behaviorState.targetHeading) {
          if (behaviorState.approachPlan) {
            // If we're in the approach sequence, move to final approach
            update.newState = AircraftState.FINAL_APPROACH;
            update.newGroundSpeed = APPROACH_SPEED; // Only slow down now
            behaviorState = {
              ...behaviorState,
              currentState: AircraftState.FINAL_APPROACH,
              stateStartTime: currentTime
            };
          } else {
            // Otherwise return to cruise
            update.newState = AircraftState.CRUISE;
            behaviorState = {
              ...behaviorState,
              currentState: AircraftState.CRUISE,
              targetHeading: undefined,
              stateStartTime: currentTime
            };
          }
        }
      }
      break;

    case AircraftState.CLIMBING:
      if (behaviorState.targetAltitude !== undefined) {
        const climbRate = 500; // feet per minute
        const altitudeChange = (climbRate * elapsedSeconds) / 60;
        const newAltitude = currentAltitude + altitudeChange;
        
        // Don't climb above target
        update.newAltitude = Math.min(newAltitude, behaviorState.targetAltitude);

        // If we've reached target altitude, return to cruise
        if (newAltitude >= behaviorState.targetAltitude) {
          update.newState = AircraftState.CRUISE;
          update.newGroundSpeed = 95; // Resume normal cruise speed
          behaviorState = {
            ...behaviorState,
            currentState: AircraftState.CRUISE,
            targetAltitude: undefined,
            stateStartTime: currentTime
          };
        }
      }
      break;

    case AircraftState.DESCENDING:
      if (behaviorState.targetAltitude !== undefined) {
        const descentRate = 500; // feet per minute
        const altitudeChange = (descentRate * elapsedSeconds) / 60;
        const newAltitude = currentAltitude - altitudeChange;
        
        // Don't descend below target
        update.newAltitude = Math.max(newAltitude, behaviorState.targetAltitude);

        // If we've reached target altitude, return to cruise
        if (newAltitude <= behaviorState.targetAltitude) {
          update.newState = AircraftState.CRUISE;
          update.newGroundSpeed = 95; // Resume normal cruise speed
          behaviorState = {
            ...behaviorState,
            currentState: AircraftState.CRUISE,
            targetAltitude: undefined,
            stateStartTime: currentTime
          };
        }
      }
      break;

    case AircraftState.APPROACH_TRANSIT:
      if (behaviorState.approachPlan) {
        const approachFix = behaviorState.approachPlan.approachFix;
        const currentPos = turf.point([behaviorState.position.lon, behaviorState.position.lat]);
        const distanceToFix = turf.distance(
          currentPos,
          turf.point([approachFix.lon, approachFix.lat]),
          { units: 'nauticalmiles' as Units }
        );

        // If we're close to the fix, turn to align with runway
        if (distanceToFix < 0.5) { // Within 0.5nm
          update.newState = AircraftState.TURNING;
          behaviorState = {
            ...behaviorState,
            currentState: AircraftState.TURNING,
            targetHeading: behaviorState.approachPlan.runway.heading,
            stateStartTime: currentTime
          };
        }
      }
      break;

    case AircraftState.FINAL_APPROACH:
      if (behaviorState.approachPlan) {
        // Calculate required descent rate
        const descentRate = DESCENT_RATE;
        const altitudeChange = (descentRate * elapsedSeconds) / 60;
        const newAltitude = currentAltitude - altitudeChange;
        
        // Don't descend below field elevation
        update.newAltitude = Math.max(
          newAltitude,
          behaviorState.approachPlan.runway.elevation
        );

        // Check if we've reached runway elevation
        if (newAltitude <= behaviorState.approachPlan.runway.elevation) {
          // Aircraft has landed - return to cruise state at pattern altitude
          update.newState = AircraftState.CLIMBING;
          behaviorState = {
            ...behaviorState,
            currentState: AircraftState.CLIMBING,
            targetAltitude: behaviorState.approachPlan.runway.elevation + CIRCUIT_ALTITUDE,
            approachPlan: undefined,
            stateStartTime: currentTime
          };
          update.newGroundSpeed = 95; // Resume normal cruise speed
        }
      }
      break;
  }

  return [behaviorState, update];
}

export function forceTurn(
  behaviorState: BehaviorState,
  currentHeading: number
): [BehaviorState, BehaviorUpdate] {
  const currentTime = Date.now();
  const targetHeading = (currentHeading + 180) % 360;

  const newState: BehaviorState = {
    ...behaviorState,
    currentState: AircraftState.TURNING,
    targetHeading,
    stateStartTime: currentTime
  };

  const update: BehaviorUpdate = {
    newState: AircraftState.TURNING
  };

  return [newState, update];
}

export function forceLanding(
  behaviorState: BehaviorState,
  currentAltitude: number
): [BehaviorState, BehaviorUpdate] {
  const currentTime = Date.now();

  // Plan the approach
  const newBehaviorState: BehaviorState = {
    ...behaviorState,
    currentState: AircraftState.TURNING, // Start with turning state
    stateStartTime: currentTime,
    approachPlan: planApproach(currentAltitude, behaviorState.rng)
  };

  // Calculate bearing to approach fix
  const approachFix = newBehaviorState.approachPlan!.approachFix;
  const currentPos = turf.point([behaviorState.position.lon, behaviorState.position.lat]);
  const bearingToFix = turf.bearing(
    currentPos,
    turf.point([approachFix.lon, approachFix.lat])
  );

  // Set target heading but don't change current heading
  newBehaviorState.targetHeading = bearingToFix;
  newBehaviorState.targetAltitude = approachFix.altitude;

  const update: BehaviorUpdate = {
    newState: AircraftState.TURNING
    // No speed change yet - maintain cruise speed until final approach
  };

  return [newBehaviorState, update];
}

export function forceFlyTo(
  behaviorState: BehaviorState,
  targetLat: number,
  targetLon: number
): [BehaviorState, BehaviorUpdate] {
  const currentTime = Date.now();

  // Calculate bearing to target point
  const currentPos = turf.point([behaviorState.position.lon, behaviorState.position.lat]);
  const targetPos = turf.point([targetLon, targetLat]);
  const bearingToTarget = turf.bearing(currentPos, targetPos);

  const newBehaviorState: BehaviorState = {
    ...behaviorState,
    currentState: AircraftState.TURNING,
    stateStartTime: currentTime,
    targetHeading: bearingToTarget
  };

  const update: BehaviorUpdate = {
    newState: AircraftState.TURNING
  };

  return [newBehaviorState, update];
}

export function forceClimb(
  behaviorState: BehaviorState,
  currentAltitude: number
): [BehaviorState, BehaviorUpdate] {
  const currentTime = Date.now();
  const targetAltitude = currentAltitude + 1000; // Climb 1000 feet

  const newBehaviorState: BehaviorState = {
    ...behaviorState,
    currentState: AircraftState.CLIMBING,
    stateStartTime: currentTime,
    targetAltitude
  };

  const update: BehaviorUpdate = {
    newState: AircraftState.CLIMBING,
    newGroundSpeed: 90 // Slow slightly for climb
  };

  return [newBehaviorState, update];
}

export function forceDescent(
  behaviorState: BehaviorState,
  currentAltitude: number
): [BehaviorState, BehaviorUpdate] {
  const currentTime = Date.now();
  const targetAltitude = Math.max(currentAltitude - 1000, FIELD_ELEVATION + 500); // Descend 1000 feet, but not below 500 AGL

  const newBehaviorState: BehaviorState = {
    ...behaviorState,
    currentState: AircraftState.DESCENDING,
    stateStartTime: currentTime,
    targetAltitude
  };

  const update: BehaviorUpdate = {
    newState: AircraftState.DESCENDING,
    newGroundSpeed: 90 // Slow slightly for descent
  };

  return [newBehaviorState, update];
} 