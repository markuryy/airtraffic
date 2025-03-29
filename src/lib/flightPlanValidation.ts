import { FlightPlan, ValidationError } from '@/types/flightPlan';

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
  }

  // Altitude validation
  const altitude = parseInt(plan.altitude) * 100;
  if (isNaN(altitude) || altitude < 1000) {
    errors.push({ field: 'altitude', message: 'Valid altitude is required (minimum 1000ft)' });
  }

  // Fuel validation
  const fuel = parseFloat(plan.fuel);
  if (isNaN(fuel) || fuel <= 0) {
    errors.push({ field: 'fuel', message: 'Valid fuel quantity is required' });
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