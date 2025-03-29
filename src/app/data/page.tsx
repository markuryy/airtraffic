'use client';

import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import aircraftTypes from '@/data/aircraft-types.json';
import airportList from '@/data/airport-list.json';
import airports from '@/data/airports.json';
import obstructions from '@/data/obstructions.json';
import terrain from '@/data/terrain.json';
import runways from '@/data/runways.json';
import coastline from '@/data/coastline.json';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function CoastlineVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = 400;
  const height = 300;
  const padding = 20;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);

    // Find bounds of all coordinates
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    coastline.features.forEach(feature => {
      feature.geometry.coordinates.forEach(([lon, lat]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      });
    });

    // Add padding to bounds
    const latPadding = (maxLat - minLat) * 0.1;
    const lonPadding = (maxLon - minLon) * 0.1;
    minLat -= latPadding;
    maxLat += latPadding;
    minLon -= lonPadding;
    maxLon += lonPadding;

    // Scale factors
    const scaleX = (width - 2 * padding) / (maxLon - minLon);
    const scaleY = (height - 2 * padding) / (maxLat - minLat);

    // Convert geo coordinates to canvas coordinates
    const geoToCanvas = (lon: number, lat: number): [number, number] => [
      padding + (lon - minLon) * scaleX,
      height - (padding + (lat - minLat) * scaleY)
    ];

    // Draw coastlines
    coastline.features.forEach((feature, index) => {
      ctx.beginPath();
      ctx.strokeStyle = index === 0 ? '#3b82f6' : '#60a5fa'; // Different colors for each coastline
      ctx.lineWidth = 2;

      const coords = feature.geometry.coordinates;
      const [startX, startY] = geoToCanvas(coords[0][0], coords[0][1]);
      ctx.moveTo(startX, startY);

      coords.forEach(([lon, lat]) => {
        const [x, y] = geoToCanvas(lon, lat);
        ctx.lineTo(x, y);
      });

      ctx.stroke();

      // Add labels
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px sans-serif';
      const [labelX, labelY] = geoToCanvas(
        coords[Math.floor(coords.length / 2)][0],
        coords[Math.floor(coords.length / 2)][1]
      );
      ctx.fillText(feature.properties.name, labelX, labelY - 5);
    });

    // Draw compass rose
    ctx.save();
    ctx.translate(width - 40, height - 40);
    ctx.strokeStyle = '#374151';
    ctx.fillStyle = '#374151';
    ctx.font = '10px sans-serif';
    
    // North arrow
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(0, -15);
    ctx.moveTo(-5, -10);
    ctx.lineTo(0, -15);
    ctx.lineTo(5, -10);
    ctx.stroke();
    ctx.fillText('N', -3, -20);
    
    ctx.restore();

  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: width,
        height: height,
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        marginBottom: '20px'
      }}
    />
  );
}

function TerrainVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = 400;
  const height = 300;
  
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000033);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x00ff00, 0x00ff00);
    scene.add(gridHelper);

    // Process terrain data
    const points = terrain.terrain_grid;
    const minLat = Math.min(...points.map(p => p.lat));
    const maxLat = Math.max(...points.map(p => p.lat));
    const minLon = Math.min(...points.map(p => p.lon));
    const maxLon = Math.max(...points.map(p => p.lon));
    const minElev = Math.min(...points.map(p => p.elevation));
    const maxElev = Math.max(...points.map(p => p.elevation));

    // Create terrain points
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    points.forEach(point => {
      // Normalize coordinates to [-5, 5] range
      const x = ((point.lon - minLon) / (maxLon - minLon) * 10) - 5;
      const z = ((point.lat - minLat) / (maxLat - minLat) * 10) - 5;
      const y = (point.elevation - minElev) / (maxElev - minElev) * 2;

      positions.push(x, y, z);

      // Color based on elevation (cyan to magenta gradient)
      const t = (point.elevation - minElev) / (maxElev - minElev);
      color.setHSL(0.5 + t * 0.2, 1, 0.5);
      colors.push(color.r, color.g, color.b);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Create point cloud material with cyber aesthetic
    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Animation
    let frame = 0;
    const animate = () => {
      frame += 0.005;
      
      // Rotate camera around the scene
      camera.position.x = Math.cos(frame) * 7;
      camera.position.z = Math.sin(frame) * 7;
      camera.position.y = 5 + Math.sin(frame * 0.5) * 2;
      camera.lookAt(0, 0, 0);

      // Pulse the point sizes
      material.size = 0.2 + Math.sin(frame * 2) * 0.05;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // Add glow post-processing
    const composer = new THREE.WebGLRenderer({ antialias: true });
    composer.setSize(width, height);

    return () => {
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        width: width, 
        height: height, 
        backgroundColor: '#000033',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '20px',
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)',
        border: '1px solid rgba(0, 255, 255, 0.1)'
      }} 
    />
  );
}

export default function DataViewerPage() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <MuiLink component="button" variant="body1" sx={{ color: 'text.secondary' }}>
              ← Back to Home
            </MuiLink>
          </Link>
          <Typography variant="h4" component="h1">
            Data Viewer
          </Typography>
          <Box sx={{ width: 100 }} /> {/* Spacer for alignment */}
        </Box>

        {/* Main Content */}
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Aircraft Types" />
            <Tab label="Airports" />
            <Tab label="Airport List" />
            <Tab label="Obstructions" />
            <Tab label="Terrain" />
            <Tab label="Runways" />
            <Tab label="Coastlines" />
          </Tabs>

          {/* Aircraft Types */}
          <TabPanel value={currentTab} index={0}>
            <Typography variant="h6" gutterBottom>Aircraft Types</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Cruise Speed (kt)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aircraftTypes.types.map((aircraft) => (
                    <TableRow key={aircraft.id}>
                      <TableCell>{aircraft.id}</TableCell>
                      <TableCell>{aircraft.label}</TableCell>
                      <TableCell align="right">{aircraft.cruiseSpeed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Airports */}
          <TabPanel value={currentTab} index={1}>
            <Typography variant="h6" gutterBottom>Airports</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell align="right">Latitude</TableCell>
                    <TableCell align="right">Longitude</TableCell>
                    <TableCell>Runways</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(airports).map(([id, data]) => (
                    <TableRow key={id}>
                      <TableCell>{id}</TableCell>
                      <TableCell align="right">{data.coordinates.lat.toFixed(4)}</TableCell>
                      <TableCell align="right">{data.coordinates.lon.toFixed(4)}</TableCell>
                      <TableCell>
                        {data.runways.map(rw => `${rw.id} (${rw.heading}°)`).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Airport List */}
          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6" gutterBottom>Airport List</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Elevation (ft)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(terrain.airports).map(([id, data]) => (
                    <TableRow key={id}>
                      <TableCell>{id}</TableCell>
                      <TableCell>{data.name}</TableCell>
                      <TableCell align="right">{data.elevation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Obstructions */}
          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" gutterBottom>Obstructions</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Latitude</TableCell>
                    <TableCell align="right">Longitude</TableCell>
                    <TableCell align="right">Height (ft)</TableCell>
                    <TableCell align="right">Elevation (ft)</TableCell>
                    <TableCell>Lighting</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {obstructions.obstructions.map((obstruction, index) => (
                    <TableRow key={index}>
                      <TableCell>{obstruction.type}</TableCell>
                      <TableCell align="right">{obstruction.lat.toFixed(4)}</TableCell>
                      <TableCell align="right">{obstruction.lon.toFixed(4)}</TableCell>
                      <TableCell align="right">{obstruction.height}</TableCell>
                      <TableCell align="right">{obstruction.elevation}</TableCell>
                      <TableCell>{obstruction.lighting}</TableCell>
                      <TableCell>{obstruction.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Terrain */}
          <TabPanel value={currentTab} index={4}>
            <Typography variant="h6" gutterBottom>Terrain Grid Points</Typography>
            <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
              <Box sx={{ flex: '0 0 400px' }}>
                <TerrainVisualization />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell align="right">Latitude</TableCell>
                        <TableCell align="right">Longitude</TableCell>
                        <TableCell align="right">Elevation (ft)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {terrain.terrain_grid.map((point, index) => (
                        <TableRow key={index}>
                          <TableCell align="right">{point.lat.toFixed(4)}</TableCell>
                          <TableCell align="right">{point.lon.toFixed(4)}</TableCell>
                          <TableCell align="right">{point.elevation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          </TabPanel>

          {/* Runways */}
          <TabPanel value={currentTab} index={5}>
            <Typography variant="h6" gutterBottom>Runways</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Airport</TableCell>
                    <TableCell>Runway</TableCell>
                    <TableCell align="right">Length (ft)</TableCell>
                    <TableCell align="right">Width (ft)</TableCell>
                    <TableCell align="right">Heading</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(runways).map(([airport, data]) => (
                    data.runways.map((runway) => (
                      <TableRow key={`${airport}-${runway.id}`}>
                        <TableCell>{airport}</TableCell>
                        <TableCell>{runway.id}</TableCell>
                        <TableCell align="right">{runway.length}</TableCell>
                        <TableCell align="right">{runway.width}</TableCell>
                        <TableCell align="right">{runway.heading}°</TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Coastlines */}
          <TabPanel value={currentTab} index={6}>
            <Typography variant="h6" gutterBottom>Coastlines</Typography>
            <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
              <Box sx={{ flex: '0 0 400px' }}>
                <CoastlineVisualization />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Points</TableCell>
                        <TableCell align="right">Start Coordinates</TableCell>
                        <TableCell align="right">End Coordinates</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {coastline.features.map((feature, index) => (
                        <TableRow key={index}>
                          <TableCell>{feature.properties.name}</TableCell>
                          <TableCell>{feature.geometry.coordinates.length} points</TableCell>
                          <TableCell align="right">
                            {feature.geometry.coordinates[0][1].toFixed(4)}°N, {Math.abs(feature.geometry.coordinates[0][0]).toFixed(4)}°W
                          </TableCell>
                          <TableCell align="right">
                            {feature.geometry.coordinates[feature.geometry.coordinates.length - 1][1].toFixed(4)}°N, {Math.abs(feature.geometry.coordinates[feature.geometry.coordinates.length - 1][0]).toFixed(4)}°W
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
} 