'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  PlaneTakeoff,
  Check,
  Square,
  RefreshCw,
  X
} from 'lucide-react';
import { getFlightPlans } from '@/lib/flightPlanStorage';
import { StoredFlightPlan } from '@/types/flightPlan';
import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';
import airportList from '@/data/airport-list.json';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

// Add a constant for the storage key
const ACTIVE_FLIGHTS_KEY = 'activeFlightIds';
const FLIGHT_ACTIVATIONS_KEY = 'flightActivations';

// Import FlightMap with dynamic loading to avoid SSR issues with Leaflet
const RadarScope = dynamic(() => import('@/components/RadarScope'), {
  ssr: false,
  loading: () => (
    <div className="h-[800px] bg-black flex items-center justify-center">
      <p className="text-green-500">Initializing radar...</p>
    </div>
  ),
});

export default function OperationsPage() {
  const [activeFlights, setActiveFlights] = useState<ActiveFlight[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize web worker
    workerRef.current = new Worker(new URL('@/workers/flightSimWorker.ts', import.meta.url));
    
    // Handle messages from worker
    workerRef.current.onmessage = (event) => {
      const { type, updates, flights } = event.data;
      
      if (type === 'positions') {
        setActiveFlights(current => 
          current.map(flight => {
            const update = updates.find((u: { id: string; }) => u.id === flight.id);
            if (update) {
              return {
                ...flight,
                position: update.position,
                completed: update.completed
              };
            }
            return flight;
          })
        );
      } else if (type === 'activeFlights') {
        // Update with current active flights from worker
        setActiveFlights(current => 
          current.map(flight => {
            const activeData = flights.find((f: { id: string; }) => f.id === flight.id);
            if (activeData) {
              return {
                ...flight,
                position: activeData.position,
                completed: activeData.completed
              };
            }
            return flight;
          })
        );
      }
    };

    // Request current active flights
    workerRef.current.postMessage({ type: 'getActive' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Load active flight IDs from local storage
  useEffect(() => {
    const loadActiveFlightIds = async () => {
      const storedIds = localStorage.getItem(ACTIVE_FLIGHTS_KEY);
      const storedActivations = localStorage.getItem(FLIGHT_ACTIVATIONS_KEY);
      
      if (!storedIds) return;
      
      const activeIds = JSON.parse(storedIds) as string[];
      const activations = storedActivations ? JSON.parse(storedActivations) : {};
      
      console.log('Loading active flights from storage:', { activeIds, activations });
      
      // Filter for approved flight plans and activate them
      const approvedFlights = getFlightPlans().filter(fp => 
        fp.status === 'APPROVED' && activeIds.includes(fp.id)
      );
      
      for (const flight of approvedFlights) {
        const startTime = activations[flight.id];
        if (startTime) {
          workerRef.current?.postMessage({ type: 'activate', data: { flight, startTime } });
        }
      }
    };

    if (workerRef.current) {
      loadActiveFlightIds();
    }
  }, []);

  useEffect(() => {
    loadFlightPlans();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadFlightPlans = () => {
    const plans = getFlightPlans();
    // Only show approved plans that haven't been closed
    const approvedPlans = plans.filter(plan => plan.status === 'APPROVED');
    setActiveFlights(approvedPlans.map(plan => ({
      ...plan,
      position: undefined,
      completed: false
    })));
    setLastRefresh(new Date());
  };

  const formatTime = (timeStr: string) => {
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}Z`;
  };

  const activateFlight = async (flightId: string) => {
    const flight = getFlightPlans().find(fp => fp.id === flightId);
    if (!flight || flight.status !== 'APPROVED') return;

    // Get current active flights
    const storedIds = localStorage.getItem(ACTIVE_FLIGHTS_KEY);
    const activeIds = storedIds ? JSON.parse(storedIds) : [];
    
    // Get current activations
    const storedActivations = localStorage.getItem(FLIGHT_ACTIVATIONS_KEY);
    const activations = storedActivations ? JSON.parse(storedActivations) : {};
    
    if (!activeIds.includes(flightId)) {
      // Add to active flights
      activeIds.push(flightId);
      localStorage.setItem(ACTIVE_FLIGHTS_KEY, JSON.stringify(activeIds));
      
      // Store activation time
      const startTime = Date.now();
      activations[flightId] = startTime;
      localStorage.setItem(FLIGHT_ACTIVATIONS_KEY, JSON.stringify(activations));
      
      // Activate in worker
      workerRef.current?.postMessage({ type: 'activate', data: { flight, startTime } });
    }
  };

  const deactivateFlight = async (flightId: string) => {
    // Get current active flights
    const storedIds = localStorage.getItem(ACTIVE_FLIGHTS_KEY);
    const activeIds = storedIds ? JSON.parse(storedIds) : [];
    
    // Get current activations
    const storedActivations = localStorage.getItem(FLIGHT_ACTIVATIONS_KEY);
    const activations = storedActivations ? JSON.parse(storedActivations) : {};
    
    // Remove from active flights
    const updatedIds = activeIds.filter((id: string) => id !== flightId);
    localStorage.setItem(ACTIVE_FLIGHTS_KEY, JSON.stringify(updatedIds));
    
    // Remove activation time
    delete activations[flightId];
    localStorage.setItem(FLIGHT_ACTIVATIONS_KEY, JSON.stringify(activations));
    
    // Deactivate in worker
    workerRef.current?.postMessage({ type: 'deactivate', data: { flightId } });
  };

  const closeFlight = (flightId: string) => {
    // Remove from active flights state
    setActiveFlights(current => current.filter(f => f.id !== flightId));
    
    // Remove from local storage
    const storedIds = localStorage.getItem(ACTIVE_FLIGHTS_KEY);
    const activeIds = storedIds ? JSON.parse(storedIds).filter((id: string) => id !== flightId) : [];
    localStorage.setItem(ACTIVE_FLIGHTS_KEY, JSON.stringify(activeIds));
    
    // Remove from activations
    const storedActivations = localStorage.getItem(FLIGHT_ACTIVATIONS_KEY);
    if (storedActivations) {
      const activations = JSON.parse(storedActivations);
      delete activations[flightId];
      localStorage.setItem(FLIGHT_ACTIVATIONS_KEY, JSON.stringify(activations));
    }
  };

  const formatPosition = (position?: Position) => {
    if (!position) return 'Not Started';
    
    // Find nearest airport and calculate distance/bearing
    let nearestAirport = airportList.airports[0];
    let minDistance = Infinity;
    let nearestBearing = 0;

    // Create aircraft position point once
    const aircraftPoint = turf.point([position.lon, position.lat]);

    airportList.airports.forEach(airport => {
      // Create airport point
      const airportPoint = turf.point([airport.lon, airport.lat]);
      
      const distance = turf.distance(
        airportPoint,
        aircraftPoint,
        { units: 'nauticalmiles' as Units }
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestAirport = airport;
        // Calculate bearing from airport to aircraft
        nearestBearing = turf.bearing(airportPoint, aircraftPoint);
        // Normalize bearing to 0-360 degrees
        nearestBearing = (nearestBearing + 360) % 360;
      }
    });

    // Convert bearing to cardinal direction
    const cardinalPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(nearestBearing / 45) % 8;
    const direction = cardinalPoints[index];

    // Verify the calculation looks reasonable
    if (minDistance > 1000) {
      console.warn('Suspicious distance calculation:', {
        position,
        nearestAirport,
        distance: minDistance,
        bearing: nearestBearing
      });
      return 'Position calculation error';
    }

    return `${Math.round(minDistance)}nm ${direction} of ${nearestAirport.id}, ${position.altitude}ft`;
  };

  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid lines resembling radar */}
        <div className="absolute inset-0 grid grid-cols-12 gap-4 opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`vline-${i}`} className="h-full w-px bg-blue-300"></div>
          ))}
        </div>
        <div className="absolute inset-0 grid grid-rows-12 gap-4 opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`hline-${i}`} className="w-full h-px bg-blue-300"></div>
          ))}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Back to Home Link and Time */}
        <div className="mb-6 flex justify-between items-center">
          <Button variant="ghost" asChild className="text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <div className="font-mono text-xl text-muted-foreground font-medium">
            {currentTime.toISOString().slice(11, 19)}Z
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex gap-4">
          {/* Left Side - Flight Strips */}
          <div className="flex-shrink-0 w-[400px]">
            <Card className="bg-card shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between px-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <PlaneTakeoff className="h-6 w-6" />
                  Flight Operations
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadFlightPlans}
                  className="text-muted-foreground"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </CardHeader>
              
              <CardContent className="px-6 pb-6">
                {/* Last Refresh Time */}
                <p className="text-sm text-muted-foreground mb-4">
                  Last refreshed: {lastRefresh.toLocaleTimeString()}
                </p>

                {/* Flight Strips */}
                <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-2">
                  {activeFlights.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No active flight plans
                    </div>
                  ) : (
                    activeFlights.map((flight) => (
                      <Card 
                        key={flight.id} 
                        className={`
                          border-l-4 
                          ${flight.completed ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20' : 
                            flight.position ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20' : 
                            'border-l-zinc-500'}
                        `}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col gap-3">
                              {/* Aircraft and Route */}
                              <div className="flex gap-4">
                                <div>
                                  <p className="text-lg font-mono font-medium">
                                    {flight.aircraft?.id || 'N/A'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {flight.departure?.id || '????'} → {flight.destination?.id || '????'}
                                  </p>
                                </div>

                                <div>
                                  <p className="font-mono">
                                    FL{flight.altitude} {flight.speed}kt
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    ETD: {formatTime(flight.etdTime)} {flight.etdDate}
                                  </p>
                                </div>
                              </div>

                              {/* Position information */}
                              <div className="w-full">
                                <p className="font-mono text-sm">
                                  {formatPosition(flight.position)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {flight.completed ? 'COMPLETED' : flight.position ? 'IN PROGRESS' : 'SCHEDULED'}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-1">
                              <TooltipProvider>
                                {!flight.position && !flight.completed && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => activateFlight(flight.id)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                      >
                                        <Check className="h-5 w-5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Start Flight</TooltipContent>
                                  </Tooltip>
                                )}
                                {flight.position && !flight.completed && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deactivateFlight(flight.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                      >
                                        <Square className="h-5 w-5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Stop Flight</TooltipContent>
                                  </Tooltip>
                                )}
                                {flight.completed && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => closeFlight(flight.id)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                      >
                                        <X className="h-5 w-5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Close Flight</TooltipContent>
                                  </Tooltip>
                                )}
                              </TooltipProvider>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Radar Scope */}
          <Card className="flex-1 p-2 bg-black border-background">
            <CardContent className="p-0 flex items-center justify-center">
              <RadarScope activeFlights={activeFlights} width={800} height={800} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}