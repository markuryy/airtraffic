import { useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';

interface AltitudeProfileProps {
  departure: { lat: number; lon: number } | null;
  destination: { lat: number; lon: number } | null;
  altitude: string;
  aircraftSpeed: number;
  width?: number;
  height?: number;
}

// Constants for climb/descent rates
const STANDARD_CLIMB_RATE = 500; // feet per minute
const STANDARD_DESCENT_RATE = 800; // feet per minute

export default function AltitudeProfile({ 
  departure, 
  destination, 
  altitude,
  aircraftSpeed,
  width = 600,
  height = 200 
}: AltitudeProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !departure || !destination) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);

    // Calculate flight parameters
    const from = turf.point([departure.lon, departure.lat]);
    const to = turf.point([destination.lon, destination.lat]);
    const totalDistance = turf.distance(from, to, { units: 'nauticalmiles' as Units });
    const cruiseAltitude = parseInt(altitude) * 100; // Convert FL to feet

    // Calculate climb and descent parameters
    const timeToClimb = cruiseAltitude / STANDARD_CLIMB_RATE; // minutes
    const timeToDescend = cruiseAltitude / STANDARD_DESCENT_RATE; // minutes
    const climbSpeed = Math.min(aircraftSpeed * 0.7, 120);
    const descentSpeed = Math.min(aircraftSpeed * 0.8, 140);
    const climbDistance = (climbSpeed / 60) * timeToClimb;
    const descentDistance = (descentSpeed / 60) * timeToDescend;
    const cruiseDistance = Math.max(0, totalDistance - (climbDistance + descentDistance));

    // Padding for drawing
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Scale factors
    const scaleX = graphWidth / totalDistance;
    const scaleY = graphHeight / cruiseAltitude;

    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    // X axis
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    
    // Y axis
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(padding.left, padding.top);
    ctx.stroke();

    // Draw altitude profile
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    // Starting point
    ctx.moveTo(padding.left, height - padding.bottom);

    // Climb phase
    ctx.lineTo(
      padding.left + climbDistance * scaleX,
      height - padding.bottom - cruiseAltitude * scaleY
    );

    // Cruise phase
    ctx.lineTo(
      padding.left + (climbDistance + cruiseDistance) * scaleX,
      height - padding.bottom - cruiseAltitude * scaleY
    );

    // Descent phase
    ctx.lineTo(
      padding.left + (climbDistance + cruiseDistance + descentDistance) * scaleX,
      height - padding.bottom
    );

    ctx.stroke();

    // Draw altitude labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    
    // Draw altitude markers every 1000ft
    const altitudeStep = 1000;
    for (let alt = 0; alt <= cruiseAltitude; alt += altitudeStep) {
      const y = height - padding.bottom - alt * scaleY;
      ctx.fillText(alt.toLocaleString() + 'ft', padding.left - 5, y + 4);
      
      // Draw grid line
      ctx.beginPath();
      ctx.strokeStyle = '#e5e7eb';
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw distance labels
    ctx.textAlign = 'center';
    const distanceStep = Math.ceil(totalDistance / 5) * 5;
    for (let dist = 0; dist <= totalDistance; dist += distanceStep) {
      const x = padding.left + dist * scaleX;
      ctx.fillText(dist + 'nm', x, height - padding.bottom + 20);
      
      // Draw grid line
      ctx.beginPath();
      ctx.strokeStyle = '#e5e7eb';
      ctx.moveTo(x, height - padding.bottom);
      ctx.lineTo(x, padding.top);
      ctx.stroke();
    }

    // Draw phase labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    
    // Climb
    ctx.fillText(
      `Climb (${Math.round(timeToClimb)}min, ${Math.round(climbDistance)}nm)`,
      padding.left + (climbDistance * scaleX) / 2,
      height - padding.bottom - (cruiseAltitude * scaleY) / 2
    );
    
    // Cruise
    if (cruiseDistance > 0) {
      ctx.fillText(
        `Cruise (${Math.round(cruiseDistance)}nm)`,
        padding.left + climbDistance * scaleX + (cruiseDistance * scaleX) / 2,
        height - padding.bottom - cruiseAltitude * scaleY - 10
      );
    }
    
    // Descent
    ctx.fillText(
      `Descent (${Math.round(timeToDescend)}min, ${Math.round(descentDistance)}nm)`,
      padding.left + (climbDistance + cruiseDistance) * scaleX + (descentDistance * scaleX) / 2,
      height - padding.bottom - (cruiseAltitude * scaleY) / 2
    );

  }, [departure, destination, altitude, aircraftSpeed, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: 'auto',
        maxWidth: width,
        backgroundColor: '#f3f4f6',
        borderRadius: '8px'
      }}
    />
  );
} 