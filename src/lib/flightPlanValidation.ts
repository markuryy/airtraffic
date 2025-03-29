import { FlightPlan, ValidationError } from '@/types/flightPlan';
import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';

// Standard climb/descent rates in feet per minute
const STANDARD_CLIMB_RATE = 500;
const STANDARD_DESCENT_RATE = 800;
const MIN_CRUISE_DISTANCE = 5; // Reduced from 10 to 5nm for short flights
const MIN_FLIGHT_ALTITUDE = 500; // Minimum altitude in feet for any flight

// Fuel planning constants
const FUEL_RESERVE_HOURS = 0.75; // 45 minutes reserve
const CLIMB_FUEL_MULTIPLIER = 1.3; // 30% more fuel burn during climb
const DESCENT_FUEL_MULTIPLIER = 0.8; // 20% less fuel burn during descent

function calculateFuelRequired(plan: FlightPlan): { 
  totalFuel: number; 
  climbFuel: number;
  cruiseFuel: number;
  descentFuel: number;
  reserveFuel: number;
} {
  if (!plan.departure || !plan.destination || !plan.aircraft) {
    return { totalFuel: 0, climbFuel: 0, cruiseFuel: 0, descentFuel: 0, reserveFuel: 0 };
  }

  // Calculate distance and times
  const from = turf.point([plan.departure.lon, plan.departure.lat]);
  const to = turf.point([plan.destination.lon, plan.destination.lat]);
  const distance = turf.distance(from, to, { units: 'nauticalmiles' as Units });

  const cruiseAltitude = parseInt(plan.altitude) * 100;
  const timeToClimb = cruiseAltitude / STANDARD_CLIMB_RATE; // minutes
  const timeToDescend = cruiseAltitude / STANDARD_DESCENT_RATE; // minutes

  // Calculate speeds and distances for each phase
  const climbSpeed = Math.min(plan.aircraft.cruiseSpeed * 0.7, 120);
  const descentSpeed = Math.min(plan.aircraft.cruiseSpeed * 0.8, 140);
  const climbDistance = (climbSpeed / 60) * timeToClimb;
  const descentDistance = (descentSpeed / 60) * timeToDescend;
  const cruiseDistance = Math.max(0, distance - (climbDistance + descentDistance));

  // Calculate times for each phase
  const climbTimeHours = timeToClimb / 60;
  const descentTimeHours = timeToDescend / 60;
  const cruiseTimeHours = cruiseDistance / plan.aircraft.cruiseSpeed;

  // Calculate fuel for each phase
  const climbFuel = plan.aircraft.fuelBurn * climbTimeHours * CLIMB_FUEL_MULTIPLIER;
  const cruiseFuel = plan.aircraft.fuelBurn * cruiseTimeHours;
  const descentFuel = plan.aircraft.fuelBurn * descentTimeHours * DESCENT_FUEL_MULTIPLIER;
  const reserveFuel = plan.aircraft.fuelBurn * FUEL_RESERVE_HOURS;

  const totalFuel = climbFuel + cruiseFuel + descentFuel + reserveFuel;

  return {
    totalFuel,
    climbFuel,
    cruiseFuel,
    descentFuel,
    reserveFuel
  };
}

function validateCruiseAltitude(plan: FlightPlan): ValidationError | null {
  if (!plan.departure || !plan.destination || !plan.aircraft) return null;

  // Calculate distance between airports
  const from = turf.point([plan.departure.lon, plan.departure.lat]);
  const to = turf.point([plan.destination.lon, plan.destination.lat]);
  const distance = turf.distance(from, to, { units: 'nauticalmiles' as Units });

  // For very short flights (under 10nm), suggest pattern altitude
  if (distance < 10) {
    const requestedAlt = parseInt(plan.altitude) * 100;
    if (requestedAlt > 2500) {
      return {
        field: 'altitude',
        message: `For a ${Math.round(distance)}nm flight, recommend staying at or below 2,500ft. ` +
                 `Enter '025' for 2,500ft.`
      };
    }
    // If altitude is reasonable for short flight, allow it
    if (requestedAlt >= MIN_FLIGHT_ALTITUDE) {
      return null;
    }
  }

  // Calculate time to climb/descend to/from cruise altitude
  const cruiseAltitude = parseInt(plan.altitude) * 100; // Convert FL to feet
  const timeToClimb = cruiseAltitude / STANDARD_CLIMB_RATE; // minutes
  const timeToDescend = cruiseAltitude / STANDARD_DESCENT_RATE; // minutes

  // Calculate distance covered during climb and descent
  const climbSpeed = Math.min(plan.aircraft.cruiseSpeed * 0.7, 120); // Reduced speed during climb
  const descentSpeed = Math.min(plan.aircraft.cruiseSpeed * 0.8, 140); // Reduced speed during descent
  const climbDistance = (climbSpeed / 60) * timeToClimb; // nm
  const descentDistance = (descentSpeed / 60) * timeToDescend; // nm

  // Calculate remaining distance at cruise altitude
  const cruiseDistance = distance - (climbDistance + descentDistance);

  // Minimum distance needed for climb/descent profile
  const minRequiredDistance = climbDistance + descentDistance;

  // For medium distance flights (10-30nm), suggest appropriate altitude range
  if (distance < 30) {
    const maxRecommendedAlt = Math.min(5000, Math.floor(distance * 150));
    if (cruiseAltitude > maxRecommendedAlt) {
      return {
        field: 'altitude',
        message: `For a ${Math.round(distance)}nm flight, recommend staying at or below ${maxRecommendedAlt.toLocaleString()}ft. ` +
                 `Enter '${String(maxRecommendedAlt / 100).padStart(3, '0')}' for ${maxRecommendedAlt.toLocaleString()}ft.`
      };
    }
    return null;
  }

  // Validate if distance is sufficient for cruise altitude
  if (distance < minRequiredDistance) {
    const maxAlt = Math.floor((distance * STANDARD_CLIMB_RATE * 30) / climbSpeed / 100) * 100;
    return {
      field: 'altitude',
      message: `For a ${Math.round(distance)}nm flight, recommend staying at or below ${maxAlt.toLocaleString()}ft. ` +
               `Enter '${String(maxAlt / 100).padStart(3, '0')}' for ${maxAlt.toLocaleString()}ft.`
    };
  }

  // If cruise segment is too short, suggest a lower altitude
  if (cruiseDistance < MIN_CRUISE_DISTANCE) {
    // Calculate maximum reasonable altitude for this distance
    const maxAltitude = Math.floor(
      Math.min(
        (distance - MIN_CRUISE_DISTANCE) * 150,
        (distance * STANDARD_CLIMB_RATE * 30) / climbSpeed
      ) / 100
    ) * 100;
    
    return {
      field: 'altitude',
      message: `For a ${Math.round(distance)}nm flight, recommend staying at or below ${maxAltitude.toLocaleString()}ft. ` +
               `Enter '${String(maxAltitude / 100).padStart(3, '0')}' for ${maxAltitude.toLocaleString()}ft.`
    };
  }

  return null;
}

export async function validateFlightPlan(plan: FlightPlan): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Aircraft validation
  if (!plan.aircraft) {
    errors.push({ field: 'aircraft', message: 'Aircraft type is required' });
  }

  // Speed validation
  const speed = parseInt(plan.speed);
  if (isNaN(speed) || speed <= 0) {
    errors.push({ field: 'speed', message: 'Valid speed is required' });
  } else {
    // Check for supersonic flight (Mach 1 ≈ 661 knots at sea level)
    if (speed > 660) {
      errors.push({ 
        field: 'speed', 
        message: 'Supersonic flight is not permitted in civilian airspace'
      });
    }

    // Check for speed restrictions below 10,000 feet
    const altitude = parseInt(plan.altitude) * 100;
    if (altitude < 10000 && speed > 250) {
      errors.push({ 
        field: 'speed', 
        message: 'Maximum speed below 10,000 feet is 250 knots'
      });
    }
  }

  // Altitude validation
  const altitude = parseInt(plan.altitude) * 100;
  if (isNaN(altitude)) {
    errors.push({ field: 'altitude', message: 'Valid altitude is required' });
  }

  // Cruise altitude validation
  const cruiseAltitudeError = validateCruiseAltitude(plan);
  if (cruiseAltitudeError) {
    errors.push(cruiseAltitudeError);
  }

  // Fuel validation with detailed calculations
  const fuel = parseFloat(plan.fuel);
  if (isNaN(fuel) || fuel <= 0) {
    errors.push({ field: 'fuel', message: 'Valid fuel quantity is required' });
  } else if (plan.aircraft) {
    const fuelRequired = calculateFuelRequired(plan);
    if (fuel < fuelRequired.totalFuel) {
      errors.push({ 
        field: 'fuel', 
        message: `Minimum fuel required is ${fuelRequired.totalFuel.toFixed(1)} gallons:\n` +
                 `• Climb: ${fuelRequired.climbFuel.toFixed(1)} gal\n` +
                 `• Cruise: ${fuelRequired.cruiseFuel.toFixed(1)} gal\n` +
                 `• Descent: ${fuelRequired.descentFuel.toFixed(1)} gal\n` +
                 `• Reserve: ${fuelRequired.reserveFuel.toFixed(1)} gal (${FUEL_RESERVE_HOURS * 60} minutes)`
      });
    }
  }

  // Route validation
  if (!plan.departure) {
    errors.push({ field: 'departure', message: 'Departure airport is required' });
  }
  if (!plan.destination) {
    errors.push({ field: 'destination', message: 'Destination airport is required' });
  }

  // Time validation
  const timeRegex = /^([01]\d|2[0-3])([0-5]\d)$/;
  if (!timeRegex.test(plan.etdTime)) {
    errors.push({ field: 'etdTime', message: 'Valid time in HHMM format is required' });
  }

  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;
  if (!dateRegex.test(plan.etdDate)) {
    errors.push({ field: 'etdDate', message: 'Valid date in MM/DD format is required' });
  }

  return errors;
}

export async function submitFlightPlan(plan: FlightPlan): Promise<{ success: boolean; message: string }> {
  // This will eventually be an API call
  // For now, just simulate a successful submission
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Flight plan submitted successfully'
      });
    }, 1000);
  });
}

export { calculateFuelRequired }; 