import { useEffect, useRef, useState } from 'react';
import { StoredFlightPlan } from '@/types/flightPlan';
import airportList from '@/data/airport-list.json';

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

interface RadarScopeProps {
  activeFlights: ActiveFlight[];
  width?: number;
  height?: number;
}

// Find KBUF coordinates
const KBUF = airportList.airports.find(a => a.id === 'KBUF') || { lat: 42.9404, lon: -78.7322 };

// Store position history for trails
const positionHistory: Record<string, Position[]> = {};
const MAX_TRAIL_LENGTH = 50;

// Store altitude trend
const altitudeTrends: Record<string, 'climbing' | 'descending' | 'level'> = {};

export default function RadarScope({ activeFlights, width = 800, height = 800 }: RadarScopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });
  const [showAltitude, setShowAltitude] = useState(true);
  const animationFrameRef = useRef<number | null>(null);

  // Add toggle timer
  useEffect(() => {
    const timer = setInterval(() => {
      setShowAltitude(prev => !prev);
    }, 4000); // Toggle every 4 seconds

    return () => clearInterval(timer);
  }, []);

  // Calculate bounds centered on KBUF
  useEffect(() => {
    const range = 2; // Degrees of coverage from center
    const padding = 0.2;
    const latRange = range * (1 + padding);
    const lonRange = range * (1 + padding);
    
    // Calculate scale to fit bounds
    setScale({
      x: width / lonRange,
      y: height / latRange
    });
  }, [width, height]);

  // Convert geo coordinates to canvas coordinates
  const geoToCanvas = (lon: number, lat: number): [number, number] => {
    const x = (lon - KBUF.lon) * scale.x + width / 2;
    const y = (KBUF.lat - lat) * scale.y + height / 2;
    return [x, y];
  };

  // Calculate heading between two points
  const calculateHeading = (from: Position, to: Position): number => {
    const dLon = to.lon - from.lon;
    const y = Math.sin(dLon) * Math.cos(to.lat);
    const x = Math.cos(from.lat) * Math.sin(to.lat) -
              Math.sin(from.lat) * Math.cos(to.lat) * Math.cos(dLon);
    const heading = Math.atan2(y, x) * (180 / Math.PI);
    return (heading + 360) % 360;
  };

  // Calculate speed between two positions in knots
  const calculateSpeed = (from: Position, to: Position): number => {
    const R = 3440.065; // Earth's radius in nautical miles
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lon - from.lon) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in nautical miles

    const timeHours = (to.timestamp - from.timestamp) / (1000 * 60 * 60);
    return distance / timeHours; // Speed in knots
  };

  const drawAirport = (ctx: CanvasRenderingContext2D, airport: typeof airportList.airports[0]) => {
    const [x, y] = geoToCanvas(airport.lon, airport.lat);
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#666';
    ctx.fill();
    ctx.strokeStyle = '#999';
    ctx.stroke();
    
    // Draw airport identifier
    ctx.font = '12px monospace';
    ctx.fillStyle = '#999';
    ctx.fillText(airport.id, x + 8, y + 4);
    ctx.restore();
  };

  const drawTrail = (ctx: CanvasRenderingContext2D, flightId: string, positions: Position[]) => {
    ctx.save();
    // Only draw every 5th position, starting from the most recent
    for (let i = positions.length - 1; i >= 0; i -= 5) {
      const pos = positions[i];
      const [x, y] = geoToCanvas(pos.lon, pos.lat);
      const alpha = (i + 1) / positions.length;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 128, 255, ${alpha})`;
      ctx.fill();
    }
    ctx.restore();
  };

  const determineAltitudeTrend = (flightId: string, currentAltitude: number): 'climbing' | 'descending' | 'level' => {
    const positions = positionHistory[flightId];
    if (positions.length < 2) return 'level';
    
    // Get previous altitude
    const prevAltitude = positions[positions.length - 2].altitude;
    const altitudeDiff = currentAltitude - prevAltitude;
    
    return altitudeDiff > 0 ? 'climbing' : altitudeDiff < 0 ? 'descending' : 'level';
  };

  const drawFlight = (ctx: CanvasRenderingContext2D, flight: ActiveFlight) => {
    if (!flight.position || !flight.departure || !flight.destination) return;
    
    // Update position history
    if (!positionHistory[flight.id]) {
      positionHistory[flight.id] = [];
    }
    
    // Only add new position if it's different from the last one
    const lastPos = positionHistory[flight.id][positionHistory[flight.id].length - 1];
    if (!lastPos || 
        lastPos.lat !== flight.position.lat || 
        lastPos.lon !== flight.position.lon) {
      positionHistory[flight.id].push(flight.position);
      if (positionHistory[flight.id].length > MAX_TRAIL_LENGTH) {
        positionHistory[flight.id].shift();
      }
      
      // Update altitude trend
      altitudeTrends[flight.id] = determineAltitudeTrend(flight.id, flight.position.altitude);
    }
    
    // Draw trail
    drawTrail(ctx, flight.id, positionHistory[flight.id]);
    
    const [x, y] = geoToCanvas(flight.position.lon, flight.position.lat);
    
    // Calculate heading and speed
    let heading = 0;
    let speed = 0;
    if (positionHistory[flight.id].length > 1) {
      const prevPos = positionHistory[flight.id][positionHistory[flight.id].length - 2];
      heading = calculateHeading(prevPos, flight.position);
      speed = calculateSpeed(prevPos, flight.position);
    }
    
    // Draw aircraft symbol (hollow circle with heading line)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw heading line - length based on speed
    const headingRad = (heading - 90) * (Math.PI / 180);
    const lineLength = Math.min(Math.max(speed / 10, 8), 32); // Scale speed to pixels, min 8px, max 32px
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + Math.cos(headingRad) * lineLength,
      y + Math.sin(headingRad) * lineLength
    );
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw data block
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(flight.aircraft?.id || 'N/A', x + 14, y);
    
    // Alternate between altitude and speed
    if (showAltitude) {
      // Draw altitude with trend indicator
      const altitude = Math.round(flight.position.altitude / 1000).toString();
      const trend = altitudeTrends[flight.id];
      const trendSymbol = trend === 'climbing' ? '↑' : trend === 'descending' ? '↓' : ' ';
      
      // Draw altitude number
      ctx.fillText(altitude, x + 14, y + 14);
      
      // Draw trend symbol with larger font
      ctx.font = '18px monospace';
      ctx.fillText(trendSymbol, x + 14 + ctx.measureText(altitude).width, y + 14);
    } else {
      // Draw groundspeed
      const speedText = Math.round(speed).toString();
      ctx.fillText(speedText, x + 14, y + 14);
    }
    
    ctx.restore();
  };

  const drawRadarScope = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw range rings
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, (Math.min(width, height) / 5) * i, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw airports
    airportList.airports.forEach(airport => {
      const [x, y] = geoToCanvas(airport.lon, airport.lat);
      // Only draw if within canvas bounds with padding
      if (x >= -50 && x <= width + 50 && y >= -50 && y <= height + 50) {
        drawAirport(ctx, airport);
      }
    });
    
    // Draw active flights
    activeFlights.forEach(flight => drawFlight(ctx, flight));
    
    // Request next frame
    animationFrameRef.current = requestAnimationFrame(drawRadarScope);
  };

  useEffect(() => {
    drawRadarScope();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeFlights, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        borderRadius: '8px'
      }}
    />
  );
} 