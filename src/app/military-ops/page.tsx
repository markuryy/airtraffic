'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  PlaneTakeoff,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import { getFlightPlans, saveFlightPlan } from '@/lib/flightPlanStorage';
import { StoredFlightPlan } from '@/types/flightPlan';
import aircraftTypes from '@/data/aircraft-types.json';
import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';
import AudioPlayer from '@/components/AudioPlayer';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    <main className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid lines resembling radar */}
        <div className="absolute inset-0 grid grid-cols-12 gap-4 opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`vline-${i}`} className="h-full w-px bg-red-300"></div>
          ))}
        </div>
        <div className="absolute inset-0 grid grid-rows-12 gap-4 opacity-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`hline-${i}`} className="w-full h-px bg-red-300"></div>
          ))}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <Button variant="ghost" asChild className="text-gray-400 hover:text-gray-300">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            Military Operations Center
          </h1>
          <div className="font-mono text-red-500 text-xl">
            {currentTime.toISOString().slice(11, 19)}Z
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Civilian Flights Section */}
          <Card className="bg-gray-900 border border-red-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-300">
                Active Civilian Flights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeFlights.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No active civilian flights
                  </div>
                ) : (
                  activeFlights.map((flight) => (
                    <Card 
                      key={flight.id} 
                      className={`bg-gray-950 border-l-4 ${
                        interceptFlights.has(flight.id) ? 'border-l-red-600' : 'border-l-yellow-600'
                      }`}
                    >
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <p className="text-gray-300 font-mono">
                            {flight.aircraft?.id} - {formatPosition(flight)}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            FL{flight.altitude} @ {flight.speed}kt
                          </p>
                        </div>

                        <div>
                          {interceptFlights.has(flight.id) ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              F-22 DISPATCHED
                            </Badge>
                          ) : (
                            <Button
                              variant="destructive"
                              onClick={() => dispatchIntercept(flight)}
                              className="flex items-center gap-1"
                            >
                              <PlaneTakeoff className="h-4 w-4" />
                              Scramble F-22
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Intercepts Section */}
          <Card className="bg-gray-900 border border-red-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-500 flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Active F-22 Intercepts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeInterceptFlights.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No active intercept missions
                  </div>
                ) : (
                  activeInterceptFlights.map((flight) => (
                    <Card 
                      key={flight.id} 
                      className="bg-gray-950 border-l-4 border-l-red-600"
                    >
                      <CardContent className="p-4">
                        <div>
                          <p className="text-red-400 font-mono">
                            {flight.aircraft?.id} - {formatPosition(flight)}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            FL{flight.altitude} @ {flight.speed}kt
                          </p>
                          <p className="text-red-400 text-xs mt-1">
                            Intercepting: {flight.id.replace('INTERCEPT-', '')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* F-22 Stats */}
          <Card className="bg-gray-950 p-5">
            <CardTitle className="text-red-500 mb-4 text-xl">
              F-22 Raptor Combat Air Patrol
            </CardTitle>
            <div className="flex flex-wrap gap-6">
              <div className="text-gray-300 font-mono">
                Max Speed: {F22.cruiseSpeed}kt
              </div>
              <div className="text-gray-300 font-mono">
                Fuel Capacity: {F22.maxFuel}gal
              </div>
              <div className="text-gray-300 font-mono">
                Fuel Burn: {F22.fuelBurn}gal/hr
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}