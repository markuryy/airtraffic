'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FlightTakeoff as FlightTakeoffIcon,
  Check as CheckIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { getFlightPlans } from '@/lib/flightPlanStorage';
import { StoredFlightPlan } from '@/types/flightPlan';
import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';
import airportList from '@/data/airport-list.json';

interface Position {
  lat: number;
  lon: number;
  altitude: number;
  timestamp: number;
}

interface FlightUpdate {
  id: string;
  position: Position;
  completed: boolean;
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
    <Box sx={{ height: 800, bgcolor: '#001a00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ color: '#00ff00' }}>Initializing radar...</Typography>
    </Box>
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="xl">
        {/* Back to Home Link and Time */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              sx={{ color: 'text.secondary' }}
            >
              Back to Home
            </Button>
          </Link>
          <Typography 
            variant="h6" 
            sx={{ 
              fontFamily: 'monospace',
              color: 'text.secondary',
              fontWeight: 'medium'
            }}
          >
            {currentTime.toISOString().slice(11, 19)}Z
          </Typography>
        </Box>

        {/* Main Content Grid */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Left Side - Flight Strips */}
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2, flex: '0 0 400px' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <FlightTakeoffIcon sx={{ fontSize: 32 }} />
                Flight Operations
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadFlightPlans}
                sx={{ color: 'text.secondary' }}
              >
                Refresh
              </Button>
            </Box>

            {/* Last Refresh Time */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </Typography>

            {/* Flight Strips */}
            <Stack spacing={2} sx={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
              {activeFlights.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No active flight plans
                </Typography>
              ) : (
                activeFlights.map((flight) => (
                  <Paper
                    key={flight.id}
                    elevation={1}
                    sx={{
                      p: 2,
                      bgcolor: flight.completed ? 'success.light' : flight.position ? 'info.light' : 'background.paper',
                      borderLeft: 6,
                      borderColor: flight.completed ? 'success.main' : flight.position ? 'info.main' : 'primary.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 4 }}>
                        {/* Aircraft and Route */}
                        <Box>
                          <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                            {flight.aircraft?.id || 'N/A'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {flight.departure?.id || '????'} → {flight.destination?.id || '????'}
                          </Typography>
                        </Box>

                        {/* Flight Details */}
                        <Box>
                          <Typography sx={{ fontFamily: 'monospace' }}>
                            FL{flight.altitude} {flight.speed}kt
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ETD: {formatTime(flight.etdTime)} {flight.etdDate}
                          </Typography>
                        </Box>

                        {/* Position */}
                        <Box sx={{ minWidth: 300 }}>
                          <Typography sx={{ fontFamily: 'monospace' }}>
                            {formatPosition(flight.position)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {flight.completed ? 'COMPLETED' : flight.position ? 'IN PROGRESS' : 'SCHEDULED'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Actions */}
                      <Stack direction="row" spacing={1}>
                        {!flight.position && !flight.completed && (
                          <Tooltip title="Start Flight">
                            <IconButton
                              color="success"
                              onClick={() => activateFlight(flight.id)}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {flight.position && !flight.completed && (
                          <Tooltip title="Stop Flight">
                            <IconButton
                              color="error"
                              onClick={() => deactivateFlight(flight.id)}
                            >
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {flight.completed && (
                          <Tooltip title="Close Flight">
                            <IconButton
                              color="info"
                              onClick={() => closeFlight(flight.id)}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  </Paper>
                ))
              )}
            </Stack>
          </Paper>

          {/* Right Side - Radar Scope */}
          <Paper elevation={3} sx={{ 
            p: 2, 
            borderRadius: 2, 
            bgcolor: '#000000',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RadarScope activeFlights={activeFlights} width={800} height={800} />
          </Paper>
        </Box>
      </Container>
    </Box>
  );
} 