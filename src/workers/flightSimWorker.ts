import { StoredFlightPlan } from '@/types/flightPlan';
import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';

interface Position {
  lat: number;
  lon: number;
  altitude: number;
  timestamp: number;
}

interface ActiveFlight {
  plan: StoredFlightPlan;
  currentPosition: Position;
  startTime: number;
  started: boolean;
  completed: boolean;
}

const activeFlights: Map<string, ActiveFlight> = new Map();
const UPDATE_INTERVAL = 1000; // Update every second

// Calculate position based on time elapsed
function calculatePosition(flight: ActiveFlight, currentTime: number): Position {
  const plan = flight.plan;
  
  // Parse ETD date components
  const [month, day] = plan.etdDate.split('/').map(n => parseInt(n));
  const hours = parseInt(plan.etdTime.slice(0, 2));
  const minutes = parseInt(plan.etdTime.slice(2));
  
  // Use the stored start time instead of current position timestamp
  const elapsedMinutes = Math.max(0, (currentTime - flight.startTime) / (60 * 1000));
  
  console.log('Calculating position:', {
    flightId: plan.id,
    etdDate: plan.etdDate,
    etdTime: plan.etdTime,
    startTime: new Date(flight.startTime).toISOString(),
    currentTime: new Date(currentTime).toISOString(),
    elapsedMinutes
  });

  if (!plan.departure?.lat || !plan.departure?.lon || !plan.destination?.lat || !plan.destination?.lon) {
    console.error('Missing coordinates:', { departure: plan.departure, destination: plan.destination });
    return flight.currentPosition; // Return current position if coordinates are missing
  }
  
  // Create points with [lon, lat] order for turf.js
  const departure = turf.point([plan.departure.lon, plan.departure.lat]);
  const destination = turf.point([plan.destination.lon, plan.destination.lat]);
  
  // Calculate total distance and bearing
  const totalDistance = turf.distance(departure, destination, { units: 'nauticalmiles' as Units });
  const bearing = turf.bearing(departure, destination);
  
  // Calculate ground speed and flight time
  const groundSpeed = parseInt(plan.speed);
  const flightTime = totalDistance / groundSpeed * 60; // in minutes
  
  // Calculate distance traveled (ensure it's between 0 and total distance)
  const progress = Math.min(1, Math.max(0, elapsedMinutes / flightTime));
  const distanceTraveled = totalDistance * progress;
  
  // Calculate current position using turf.destination
  const currentPoint = turf.destination(departure, distanceTraveled, bearing, { units: 'nauticalmiles' as Units });

  // Calculate altitude
  const cruiseAltitude = parseInt(plan.altitude) * 100; // Convert FL to feet
  const climbRate = 1000; // feet per minute
  const descentRate = 500; // feet per minute
  
  // Time needed for climb and descent
  const timeToClimb = cruiseAltitude / climbRate; // minutes
  const timeToDescend = cruiseAltitude / descentRate; // minutes
  const cruisingTime = flightTime - timeToClimb - timeToDescend;

  let currentAltitude;
  if (elapsedMinutes <= timeToClimb) {
    // Climbing phase
    currentAltitude = Math.min(climbRate * elapsedMinutes, cruiseAltitude);
  } else if (elapsedMinutes >= flightTime - timeToDescend) {
    // Descent phase
    const timeInDescent = elapsedMinutes - (flightTime - timeToDescend);
    currentAltitude = Math.max(cruiseAltitude - (descentRate * timeInDescent), 0);
  } else {
    // Cruise phase
    currentAltitude = cruiseAltitude;
  }
  
  console.log('Flight calculations:', {
    departure: [plan.departure.lon, plan.departure.lat],
    destination: [plan.destination.lon, plan.destination.lat],
    totalDistance,
    bearing,
    groundSpeed,
    flightTime,
    elapsedMinutes,
    progress,
    distanceTraveled,
    currentPoint: currentPoint.geometry.coordinates,
    phase: elapsedMinutes <= timeToClimb ? 'CLIMB' : 
           elapsedMinutes >= flightTime - timeToDescend ? 'DESCENT' : 
           'CRUISE',
    altitude: {
      current: currentAltitude,
      target: cruiseAltitude,
      timeToClimb,
      timeToDescend
    }
  });

  const newPosition = {
    lat: currentPoint.geometry.coordinates[1],
    lon: currentPoint.geometry.coordinates[0],
    altitude: Math.round(currentAltitude), // Round to nearest foot
    timestamp: currentTime
  };

  console.log('New position calculated:', newPosition);
  return newPosition;
}

// Update all active flights
function updateFlights() {
  const currentTime = Date.now();
  console.log(`Updating flights at ${new Date(currentTime).toISOString()}`);
  console.log('Active flights:', Array.from(activeFlights.keys()));

  const updates: Array<{ id: string; position: Position; completed: boolean }> = [];

  activeFlights.forEach((flight, id) => {
    if (!flight.started || flight.completed) {
      console.log(`Skipping flight ${id} - started: ${flight.started}, completed: ${flight.completed}`);
      return;
    }

    const newPosition = calculatePosition(flight, currentTime);
    flight.currentPosition = newPosition;

    // Check if flight is complete
    const plan = flight.plan;
    if (!plan.departure?.lat || !plan.departure?.lon || !plan.destination?.lat || !plan.destination?.lon) {
      console.error('Missing coordinates for completion check:', { departure: plan.departure, destination: plan.destination });
      return;
    }

    const departure = turf.point([plan.departure.lon, plan.departure.lat]);
    const destination = turf.point([plan.destination.lon, plan.destination.lat]);
    const totalDistance = turf.distance(departure, destination, { units: 'nauticalmiles' as Units });
    
    // Use startTime instead of currentPosition.timestamp
    const elapsedMinutes = (currentTime - flight.startTime) / (60 * 1000);
    const flightTime = totalDistance / parseInt(plan.speed) * 60; // in minutes

    if (elapsedMinutes >= flightTime) {
      console.log(`Flight ${id} completed at ${new Date(currentTime).toISOString()}`);
      flight.completed = true;
      // Set final position to destination at ground level
      flight.currentPosition = {
        lat: plan.destination.lat,
        lon: plan.destination.lon,
        altitude: 0, // On the ground
        timestamp: currentTime
      };
    }

    updates.push({
      id,
      position: flight.currentPosition,
      completed: flight.completed
    });
  });

  if (updates.length > 0) {
    console.log('Sending position updates:', updates);
    postMessage({ type: 'positions', updates });
  }
}

// Start the update loop
setInterval(updateFlights, UPDATE_INTERVAL);

// Handle messages from the main thread
addEventListener('message', (event) => {
  const { type, data } = event.data;
  console.log('Worker received message:', { type, data });

  switch (type) {
    case 'activate':
      const flight: StoredFlightPlan = data.flight;
      const startTime: number = data.startTime || Date.now(); // Use provided start time or fallback to now
      
      console.log('Activating flight:', {
        id: flight.id,
        departure: flight.departure,
        destination: flight.destination,
        etd: `${flight.etdTime} ${flight.etdDate}Z`,
        startTime: new Date(startTime).toISOString()
      });

      if (!flight.departure?.lat || !flight.departure?.lon) {
        console.error('Missing departure coordinates:', flight.departure);
        return;
      }
      if (!flight.destination?.lat || !flight.destination?.lon) {
        console.error('Missing destination coordinates:', flight.destination);
        return;
      }

      activeFlights.set(flight.id, {
        plan: flight,
        currentPosition: {
          lat: flight.departure.lat,
          lon: flight.departure.lon,
          altitude: 0, // Start at ground level
          timestamp: startTime
        },
        startTime: startTime,
        started: true,
        completed: false
      });
      console.log('Flight activated:', flight.id);
      break;

    case 'deactivate':
      console.log('Deactivating flight:', data.id);
      activeFlights.delete(data.id);
      break;

    case 'getActive':
      const activeFlightData = Array.from(activeFlights.entries()).map(([id, flight]) => ({
        id,
        position: flight.currentPosition,
        completed: flight.completed
      }));
      console.log('Returning active flights:', activeFlightData);
      postMessage({ type: 'activeFlights', flights: activeFlightData });
      break;
  }
}); 