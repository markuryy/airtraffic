'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FlightTakeoff as FlightTakeoffIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { getFlightPlans, saveFlightPlan } from '@/lib/flightPlanStorage';
import { StoredFlightPlan } from '@/types/flightPlan';
import aircraftTypes from '@/data/aircraft-types.json';
import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';
import AudioPlayer from '@/components/AudioPlayer';

// Get F-22 data
const F22 = aircraftTypes.types.find(type => type.id === 'F22')!;

export default function MilitaryOpsPage() {
  const [activeFlights, setActiveFlights] = useState<StoredFlightPlan[]>([]);
  const [activeInterceptFlights, setActiveInterceptFlights] = useState<StoredFlightPlan[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [interceptFlights, setInterceptFlights] = useState<Set<string>>(new Set());
  
  // Initialize audio player
  const audioPlayer = AudioPlayer({
    takeoffSoundUrl: './sounds/f22-takeoff.mp3',
    sonicBoomSoundUrl: './sounds/sonic-boom.mp3'
  });

  // Load active flights
  useEffect(() => {
    const storedIds = localStorage.getItem('activeFlightIds');
    if (!storedIds) return;

    const activeIds = JSON.parse(storedIds) as string[];
    const allApprovedFlights = getFlightPlans().filter(fp => 
      fp.status === 'APPROVED' && activeIds.includes(fp.id)
    );

    // Split into civilian and intercept flights
    setActiveFlights(allApprovedFlights.filter(fp => !fp.id.startsWith('INTERCEPT-')));
    setActiveInterceptFlights(allApprovedFlights.filter(fp => fp.id.startsWith('INTERCEPT-')));
  }, []);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dispatchIntercept = async (flight: StoredFlightPlan) => {
    if (!flight.departure || !flight.destination) return;

    try {
      // Play takeoff sound
      await audioPlayer.playTakeoff();

      // Calculate intercept details
      const from = turf.point([flight.departure.lon, flight.departure.lat]);
      const to = turf.point([flight.destination.lon, flight.destination.lat]);
      const distance = turf.distance(from, to, { units: 'nauticalmiles' as Units });
      
      // Create intercept flight plan
      const interceptPlan: StoredFlightPlan = {
        ...flight,  // Base properties from original flight
        id: `INTERCEPT-${flight.id}`,  // Override specific properties
        aircraft: F22,
        speed: F22.cruiseSpeed.toString(),
        fuel: F22.maxFuel.toString(),
        status: 'APPROVED',
        submittedAt: new Date().toISOString(),
      };

      // Save the intercept flight plan
      saveFlightPlan(interceptPlan);
      
      // Auto-activate the intercept flight
      const storedIds = localStorage.getItem('activeFlightIds');
      const activeIds = storedIds ? JSON.parse(storedIds) : [];
      activeIds.push(interceptPlan.id);
      localStorage.setItem('activeFlightIds', JSON.stringify(activeIds));

      // Set activation time
      const storedActivations = localStorage.getItem('flightActivations');
      const activations = storedActivations ? JSON.parse(storedActivations) : {};
      activations[interceptPlan.id] = Date.now();
      localStorage.setItem('flightActivations', JSON.stringify(activations));
      
      // Track that we've created an intercept for this flight
      setInterceptFlights(prev => new Set([...prev, flight.id]));
      
      // Add to active intercept flights immediately
      setActiveInterceptFlights(prev => [...prev, interceptPlan]);

      // Play sonic boom after a 30 second delay
      setTimeout(async () => {
        try {
          await audioPlayer.playSonicBoom();
        } catch (error) {
          console.log('Failed to play sonic boom:', error);
        }
      }, 30000);
    } catch (error) {
      console.log('Error during intercept dispatch:', error);
      // Continue with intercept even if sound fails
    }
  };

  const formatPosition = (flight: StoredFlightPlan): string => {
    if (!flight.departure || !flight.destination) return 'Invalid route';
    const from = turf.point([flight.departure.lon, flight.departure.lat]);
    const to = turf.point([flight.destination.lon, flight.destination.lat]);
    const distance = turf.distance(from, to, { units: 'nauticalmiles' as Units });
    return `${Math.round(distance)}nm ${flight.departure.id} → ${flight.destination.id}`;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.900', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              sx={{ color: 'grey.500' }}
            >
              Back to Home
            </Button>
          </Link>
          <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon sx={{ fontSize: 32 }} />
            Military Operations Center
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              fontFamily: 'monospace',
              color: 'error.main',
              fontWeight: 'medium'
            }}
          >
            {currentTime.toISOString().slice(11, 19)}Z
          </Typography>
        </Box>

        {/* Main Content */}
        <Stack spacing={4}>
          {/* Civilian Flights Section */}
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              borderRadius: 2, 
              bgcolor: 'grey.800',
              border: '1px solid',
              borderColor: 'error.dark'
            }}
          >
            <Typography variant="h6" sx={{ color: 'grey.300', mb: 3 }}>
              Active Civilian Flights
            </Typography>

            <Stack spacing={2}>
              {activeFlights.length === 0 ? (
                <Typography color="grey.500" sx={{ textAlign: 'center', py: 4 }}>
                  No active civilian flights
                </Typography>
              ) : (
                activeFlights.map((flight) => (
                  <Paper
                    key={flight.id}
                    elevation={1}
                    sx={{
                      p: 2,
                      bgcolor: 'grey.900',
                      borderLeft: 6,
                      borderColor: interceptFlights.has(flight.id) ? 'error.main' : 'warning.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ color: 'grey.300', fontFamily: 'monospace' }}>
                          {flight.aircraft?.id} - {formatPosition(flight)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'grey.500', mt: 1 }}>
                          FL{flight.altitude} @ {flight.speed}kt
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {interceptFlights.has(flight.id) ? (
                          <Chip
                            icon={<SpeedIcon />}
                            label="F-22 DISPATCHED"
                            color="error"
                            variant="outlined"
                          />
                        ) : (
                          <Tooltip title="Create F-22 Raptor intercept flight plan">
                            <Button
                              variant="contained"
                              color="error"
                              startIcon={<FlightTakeoffIcon />}
                              onClick={() => dispatchIntercept(flight)}
                            >
                              Scramble F-22
                            </Button>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))
              )}
            </Stack>
          </Paper>

          {/* Active Intercepts Section */}
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              borderRadius: 2, 
              bgcolor: 'grey.800',
              border: '1px solid',
              borderColor: 'error.dark'
            }}
          >
            <Typography variant="h6" sx={{ color: 'error.main', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon />
              Active F-22 Intercepts
            </Typography>

            <Stack spacing={2}>
              {activeInterceptFlights.length === 0 ? (
                <Typography color="grey.500" sx={{ textAlign: 'center', py: 4 }}>
                  No active intercept missions
                </Typography>
              ) : (
                activeInterceptFlights.map((flight) => (
                  <Paper
                    key={flight.id}
                    elevation={1}
                    sx={{
                      p: 2,
                      bgcolor: 'grey.900',
                      borderLeft: 6,
                      borderColor: 'error.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ color: 'error.light', fontFamily: 'monospace' }}>
                          {flight.aircraft?.id} - {formatPosition(flight)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'grey.500', mt: 1 }}>
                          FL{flight.altitude} @ {flight.speed}kt
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'error.light', display: 'block', mt: 1 }}>
                          Intercepting: {flight.id.replace('INTERCEPT-', '')}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))
              )}
            </Stack>
          </Paper>

          {/* F-22 Stats */}
          <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.900', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ color: 'error.main', mb: 2 }}>
              F-22 Raptor Combat Air Patrol
            </Typography>
            <Stack direction="row" spacing={4}>
              <Typography sx={{ color: 'grey.300', fontFamily: 'monospace' }}>
                Max Speed: {F22.cruiseSpeed}kt
              </Typography>
              <Typography sx={{ color: 'grey.300', fontFamily: 'monospace' }}>
                Fuel Capacity: {F22.maxFuel}gal
              </Typography>
              <Typography sx={{ color: 'grey.300', fontFamily: 'monospace' }}>
                Fuel Burn: {F22.fuelBurn}gal/hr
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
} 