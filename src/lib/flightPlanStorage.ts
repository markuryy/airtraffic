import { FlightPlan, StoredFlightPlan } from '@/types/flightPlan';

const STORAGE_KEY = 'flightPlans';

export function saveFlightPlan(plan: FlightPlan): StoredFlightPlan {
  // Generate a unique ID (timestamp + random string)
  const id = `FP${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  
  // Create the stored plan object
  const storedPlan: StoredFlightPlan = {
    ...plan,
    id,
    submittedAt: new Date().toISOString(),
    status: 'PENDING'
  };

  // Get existing plans
  const existingPlans = getFlightPlans();
  
  // Add new plan to the list
  const updatedPlans = [...existingPlans, storedPlan];
  
  // Save to local storage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
  
  return storedPlan;
}

export function getFlightPlans(): StoredFlightPlan[] {
  const plansJson = localStorage.getItem(STORAGE_KEY);
  if (!plansJson) return [];
  
  try {
    return JSON.parse(plansJson);
  } catch (error) {
    console.error('Error parsing flight plans from storage:', error);
    return [];
  }
}

export function getFlightPlan(id: string): StoredFlightPlan | null {
  const plans = getFlightPlans();
  return plans.find(plan => plan.id === id) || null;
} 