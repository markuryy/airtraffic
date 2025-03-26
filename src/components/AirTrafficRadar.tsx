import { useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import { Units } from '@turf/helpers';
import airportData from '@/data/airports.json';
import terrainData from '@/data/terrain.json';
import obstructionData from '@/data/obstructions.json';
import { Aircraft, createTestAircraft, updateAircraftPosition } from '@/lib/aircraftMovement';
import { forceTurn, forceLanding, forceFlyTo, forceClimb, forceDescent } from '@/lib/aircraftBehavior';

interface AirTrafficRadarProps {
  width: number;
  height: number;
}

const NM_TO_PIXELS = 40; // Scale factor: 1 nautical mile = 40 pixels
const UPDATE_INTERVAL = 3000; // Update aircraft position every 3 seconds
const TRAIL_FADE_TIME = 60000; // Trail fades over 30 seconds

const AirTrafficRadar: React.FC<AirTrafficRadarProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aircraft, setAircraft] = useState<Aircraft>(() => 
    createTestAircraft([airportData.KBUF.coordinates.lon, airportData.KBUF.coordinates.lat])
  );
  const [showTerrain, setShowTerrain] = useState(true);
  const [showState, setShowState] = useState(false);  // State display toggle

  // Convert geo coordinates to screen coordinates relative to KBUF
  const geoToScreen = (lon: number, lat: number, centerX: number, centerY: number): [number, number] => {
    const point = turf.point([lon, lat]);
    const center = turf.point([airportData.KBUF.coordinates.lon, airportData.KBUF.coordinates.lat]);
    const distance = turf.distance(center, point, { units: 'nauticalmiles' as Units });
    const bearing = turf.bearing(center, point);
    
    // Convert polar coordinates (distance, bearing) to screen coordinates
    const x = centerX + (distance * NM_TO_PIXELS * Math.sin(bearing * Math.PI / 180));
    const y = centerY - (distance * NM_TO_PIXELS * Math.cos(bearing * Math.PI / 180));
    
    return [x, y];
  };

  function findTerrainElevation(lat: number, lon: number): number {
    // Find the closest terrain point
    let closestPoint = terrainData.terrain_grid[0];
    let minDistance = Infinity;

    for (const point of terrainData.terrain_grid) {
      const distance = turf.distance(
        turf.point([lon, lat]),
        turf.point([point.lon, point.lat]),
        { units: 'nauticalmiles' as Units }
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }

    return closestPoint.elevation;
  }

  function checkObstructionProximity(lat: number, lon: number, altitude: number): boolean {
    const LATERAL_DISTANCE_NM = 1.0; // 1nm lateral distance for alert
    const VERTICAL_BUFFER_FT = 500;  // 500ft vertical buffer

    for (const obstruction of obstructionData.obstructions) {
      const distance = turf.distance(
        turf.point([lon, lat]),
        turf.point([obstruction.lon, obstruction.lat]),
        { units: 'nauticalmiles' as Units }
      );

      if (distance < LATERAL_DISTANCE_NM && 
          Math.abs(altitude - obstruction.totalHeight) < VERTICAL_BUFFER_FT) {
        return true;
      }
    }

    return false;
  }

  const drawAircraft = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    aircraft: Aircraft
  ) => {
    const TRAIL_FADE_TIME = 30000; // 30 seconds for trail to fade out
    const AIRCRAFT_RADIUS = 5;
    const HEADING_LINE_LENGTH = 15;
    const TRAIL_POINT_RADIUS = 2;

    // Draw position history trail first
    aircraft.positionHistory.forEach(pos => {
      const age = Date.now() - pos.timestamp;
      const opacity = Math.max(0, 1 - (age / TRAIL_FADE_TIME));
      
      const [x, y] = geoToScreen(pos.lon, pos.lat, centerX, centerY);
      ctx.beginPath();
      ctx.arc(x, y, TRAIL_POINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 0, ${opacity})`;
      ctx.fill();
    });

    // Convert current position to screen coordinates
    const [x, y] = geoToScreen(aircraft.position.lon, aircraft.position.lat, centerX, centerY);

    // Draw the aircraft symbol (circle)
    ctx.beginPath();
    ctx.arc(x, y, AIRCRAFT_RADIUS, 0, Math.PI * 2);
    
    // Set color based on state
    switch (aircraft.behavior.state) {
      case 'TURNING':
        ctx.strokeStyle = 'yellow';
        break;
      case 'CLIMBING':
        ctx.strokeStyle = 'cyan';
        break;
      case 'DESCENDING':
      case 'FINAL_APPROACH':
        ctx.strokeStyle = 'magenta';
        break;
      case 'APPROACH_TRANSIT':
        ctx.strokeStyle = 'orange';
        break;
      default:
        ctx.strokeStyle = 'green';
    }
    
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw heading line
    const headingRad = (aircraft.heading - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + Math.cos(headingRad) * HEADING_LINE_LENGTH,
      y + Math.sin(headingRad) * HEADING_LINE_LENGTH
    );
    ctx.strokeStyle = ctx.strokeStyle; // Use same color as aircraft symbol
    ctx.stroke();

    // Get terrain elevation and check obstructions
    const terrainElevation = findTerrainElevation(aircraft.position.lat, aircraft.position.lon);
    const heightAboveTerrain = aircraft.altitude - terrainElevation;
    const nearObstruction = checkObstructionProximity(
      aircraft.position.lat,
      aircraft.position.lon,
      aircraft.altitude
    );
    const isLowAltitude = heightAboveTerrain < 500 || nearObstruction;

    // Draw data block
    ctx.font = '14px monospace';
    ctx.fillStyle = '#00FF00';
    ctx.textAlign = 'left';
    
    // Format data block:
    // TYPE SPD ALT
    // SQWK [STATE] [A]
    const altitudeStr = aircraft.altitude.toString().padStart(3, '0').slice(0, -2);
    const speedStr = aircraft.groundSpeed.toString().padStart(3);
    
    // Draw type and speed
    ctx.fillText(`${aircraft.type} ${speedStr}`, x + 15, y);
    
    // Draw altitude with arrow if climbing/descending
    const altX = x + 15 + ctx.measureText(`${aircraft.type} ${speedStr} `).width;
    if (aircraft.behavior.state === 'CLIMBING' || aircraft.behavior.state === 'DESCENDING') {
      ctx.fillStyle = '#FFFF00'; // Yellow for altitude changes
      const arrow = aircraft.behavior.state === 'CLIMBING' ? '↑' : '↓';
      ctx.fillText(`${altitudeStr}${arrow}`, altX, y);
      ctx.fillStyle = '#00FF00'; // Reset color
    } else {
      ctx.fillText(altitudeStr, altX, y);
    }
    
    // Draw low altitude alert if needed
    if (isLowAltitude) {
      const alertText = showState ? 
        `${aircraft.squawk} ${aircraft.behavior.state} A` :
        `${aircraft.squawk} A`;
      const textWidth = ctx.measureText(alertText).width;
      
      // Draw red background for 'A'
      const charAWidth = ctx.measureText('A').width;
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(x + 15 + textWidth - charAWidth, y + 4, charAWidth, 14);
      
      // Draw text
      ctx.fillStyle = '#00FF00';
      if (showState) {
        ctx.fillText(`${aircraft.squawk} ${aircraft.behavior.state} `, x + 15, y + 16);
      } else {
        ctx.fillText(`${aircraft.squawk} `, x + 15, y + 16);
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('A', x + 15 + textWidth - charAWidth, y + 16);
    } else {
      if (showState) {
        ctx.fillText(`${aircraft.squawk} ${aircraft.behavior.state}`, x + 15, y + 16);
      } else {
        ctx.fillText(aircraft.squawk, x + 15, y + 16);
      }
    }
  };

  const drawRunway = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    airport: string,
    runway: typeof airportData.KBUF.runways[0]
  ) => {
    const startPoint = turf.point([runway.start.lon, runway.start.lat]);
    
    // Calculate runway end point
    const endPoint = turf.destination(
      startPoint,
      runway.length / 6076.12, // Convert feet to nautical miles
      runway.heading,
      { units: 'nauticalmiles' as Units }
    );

    // Calculate extended centerline points (20nm in both directions)
    const extendedStart = turf.destination(
      startPoint,
      20,
      (runway.heading + 180) % 360, // Opposite direction
      { units: 'nauticalmiles' as Units }
    );
    
    const extendedEnd = turf.destination(
      startPoint,
      20,
      runway.heading,
      { units: 'nauticalmiles' as Units }
    );

    // Convert all coordinates to screen coordinates
    const [startX, startY] = geoToScreen(runway.start.lon, runway.start.lat, centerX, centerY);
    const [endX, endY] = geoToScreen(endPoint.geometry.coordinates[0], endPoint.geometry.coordinates[1], centerX, centerY);
    const [extStartX, extStartY] = geoToScreen(extendedStart.geometry.coordinates[0], extendedStart.geometry.coordinates[1], centerX, centerY);
    const [extEndX, extEndY] = geoToScreen(extendedEnd.geometry.coordinates[0], extendedEnd.geometry.coordinates[1], centerX, centerY);

    // Draw extended centerline (dashed)
    ctx.beginPath();
    ctx.setLineDash([10, 10]); // 10px dash, 10px gap
    ctx.moveTo(extStartX, extStartY);
    ctx.lineTo(extEndX, extEndY);
    ctx.strokeStyle = '#303030'; // Darker gray for extended centerline
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Reset dash pattern for solid runway
    ctx.setLineDash([]);

    // Draw actual runway
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Add runway label
    ctx.font = '14px monospace';
    ctx.fillStyle = '#606060';
    ctx.textAlign = 'center';
    ctx.fillText(`${airport} RWY ${runway.id}`, (startX + endX) / 2, (startY + endY) / 2 - 10);
  };

  const drawTerrainPoints = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number
  ) => {
    if (!showTerrain) return;

    ctx.font = '12px monospace';
    ctx.textAlign = 'center';

    terrainData.terrain_grid.forEach(point => {
      const [x, y] = geoToScreen(point.lon, point.lat, centerX, centerY);
      
      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#404040';
      ctx.fill();

      // Draw elevation
      ctx.fillStyle = '#404040';
      ctx.fillText(point.elevation.toString(), x, y - 10);
    });
  };

  const drawObstructions = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number
  ) => {
    if (!showTerrain) return; // Show/hide with terrain

    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#404040';
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;

    obstructionData.obstructions.forEach(obstruction => {
      const [x, y] = geoToScreen(obstruction.lon, obstruction.lat, centerX, centerY);
      
      // Draw tower symbol (triangle) for all obstructions
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x - 6, y + 4);
      ctx.lineTo(x + 6, y + 4);
      ctx.closePath();
      ctx.fill();

      // Draw height
      ctx.fillText(obstruction.totalHeight.toString(), x, y - 15);
    });
  };

  // Convert screen coordinates back to geo coordinates
  const screenToGeo = (screenX: number, screenY: number, centerX: number, centerY: number): [number, number] => {
    // Calculate distance and bearing from center (KBUF)
    const dx = screenX - centerX;
    const dy = centerY - screenY;  // Y is inverted in screen coordinates
    
    const distance = Math.sqrt(dx * dx + dy * dy) / NM_TO_PIXELS;
    const bearing = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    
    // Convert to geo coordinates using turf
    const center = turf.point([airportData.KBUF.coordinates.lon, airportData.KBUF.coordinates.lat]);
    const point = turf.destination(center, distance, bearing, { units: 'nauticalmiles' as Units });
    
    return [point.geometry.coordinates[1], point.geometry.coordinates[0]]; // [lat, lon]
  };

  // Add keyboard event handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      if (key === 'r') {
        setAircraft(currentAircraft => {
          const [newBehaviorData, behaviorUpdate] = forceTurn(
            currentAircraft.behavior.data,
            currentAircraft.heading
          );

          return {
            ...currentAircraft,
            behavior: {
              ...currentAircraft.behavior,
              state: behaviorUpdate.newState || currentAircraft.behavior.state,
              data: newBehaviorData
            }
          };
        });
      } else if (key === 'l') {
        setAircraft(currentAircraft => {
          const [newBehaviorData, behaviorUpdate] = forceLanding(
            currentAircraft.behavior.data,
            currentAircraft.altitude
          );

          return {
            ...currentAircraft,
            behavior: {
              ...currentAircraft.behavior,
              state: behaviorUpdate.newState || currentAircraft.behavior.state,
              data: newBehaviorData
            },
            heading: behaviorUpdate.newHeading || currentAircraft.heading,
            groundSpeed: behaviorUpdate.newGroundSpeed || currentAircraft.groundSpeed
          };
        });
      } else if (key === 'c') {
        setAircraft(currentAircraft => {
          const [newBehaviorData, behaviorUpdate] = forceClimb(
            currentAircraft.behavior.data,
            currentAircraft.altitude
          );

          return {
            ...currentAircraft,
            behavior: {
              ...currentAircraft.behavior,
              state: behaviorUpdate.newState || currentAircraft.behavior.state,
              data: newBehaviorData
            },
            groundSpeed: behaviorUpdate.newGroundSpeed || currentAircraft.groundSpeed
          };
        });
      } else if (key === 'd') {
        setAircraft(currentAircraft => {
          const [newBehaviorData, behaviorUpdate] = forceDescent(
            currentAircraft.behavior.data,
            currentAircraft.altitude
          );

          return {
            ...currentAircraft,
            behavior: {
              ...currentAircraft.behavior,
              state: behaviorUpdate.newState || currentAircraft.behavior.state,
              data: newBehaviorData
            },
            groundSpeed: behaviorUpdate.newGroundSpeed || currentAircraft.groundSpeed
          };
        });
      } else if (key === 'e') {
        setShowTerrain(current => !current);
      } else if (key === 's') {
        setShowState(current => !current);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    // Set up aircraft movement interval
    const intervalId = setInterval(() => {
      setAircraft(currentAircraft => 
        updateAircraftPosition(currentAircraft, UPDATE_INTERVAL / 1000)
      );
    }, UPDATE_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  // Add click handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert click coordinates to geo coordinates
      const [targetLat, targetLon] = screenToGeo(x, y, width / 2, height / 2);

      // Update aircraft behavior to fly to clicked point
      setAircraft(currentAircraft => {
        const [newBehaviorData, behaviorUpdate] = forceFlyTo(
          currentAircraft.behavior.data,
          targetLat,
          targetLon
        );

        return {
          ...currentAircraft,
          behavior: {
            ...currentAircraft.behavior,
            state: behaviorUpdate.newState || currentAircraft.behavior.state,
            data: newBehaviorData
          }
        };
      });
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set actual canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas with black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Calculate center of the canvas
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate radius for 10nm circle (using smaller screen dimension)
    const radius = 10 * NM_TO_PIXELS; // 10nm in pixels

    // Draw 10nm radius circle around KBUF
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#404040'; // Light gray
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw terrain points
    drawTerrainPoints(ctx, centerX, centerY);

    // Draw obstructions
    drawObstructions(ctx, centerX, centerY);

    // Draw KBUF runway
    drawRunway(ctx, centerX, centerY, 'KBUF', airportData.KBUF.runways[0]);

    // Draw KIAG runway
    drawRunway(ctx, centerX, centerY, 'KIAG', airportData.KIAG.runways[0]);

    // Draw aircraft
    drawAircraft(ctx, centerX, centerY, aircraft);

    // Add KBUF label (center airport)
    ctx.font = '16px monospace';
    ctx.fillStyle = '#404040';
    ctx.textAlign = 'center';
    ctx.fillText('KBUF', centerX, centerY + radius + 24);

  }, [width, height, aircraft, showTerrain]); // showTerrain controls both terrain and obstructions

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          fontFamily: 'monospace'
        }}
      />
      <div className="absolute bottom-4 right-4 text-[#404040] text-sm font-mono tracking-wide">
        <div className="bg-black bg-opacity-50 p-3 rounded-lg space-y-1">
          <p>Click - Set target</p>
          <p>L - [L]anding</p>
          <p>R - [R]otate 180°</p>
          <p>C - [C]limb 1000ft</p>
          <p>D - [D]escend 1000ft</p>
          <p>E - Toggle t[E]rrain</p>
          <p>S - Toggle [S]tate</p>
        </div>
      </div>
    </div>
  );
};

export default AirTrafficRadar; 