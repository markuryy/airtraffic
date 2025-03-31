'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import aircraftTypes from '@/data/aircraft-types.json';
import airports from '@/data/airports.json';
import obstructions from '@/data/obstructions.json';
import terrain from '@/data/terrain.json';
import runways from '@/data/runways.json';
import coastline from '@/data/coastline.json';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlaneTakeoff } from "lucide-react";

// Using shadcn/ui TabsContent directly instead of a custom wrapper

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
      className="w-[400px] h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg mb-5"
    />
  );
}

function TerrainVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Get container dimensions
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setDimensions({
          width: containerWidth - 20, // account for padding
          height: Math.min(500, containerWidth * 0.5), // responsive height
        });
      }
    };
    
    // Initial dimensions calculation
    updateDimensions();
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000033);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, dimensions.width / dimensions.height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(dimensions.width, dimensions.height);
    containerRef.current.appendChild(renderer.domElement);

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.8;
    controls.maxDistance = 20;
    controls.minDistance = 2;
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 1.0;

    // Display a help message on hover
    const helpText = document.createElement('div');
    helpText.style.position = 'absolute';
    helpText.style.bottom = '10px';
    helpText.style.left = '10px';
    helpText.style.color = 'white';
    helpText.style.fontSize = '12px';
    helpText.style.pointerEvents = 'none';
    helpText.style.userSelect = 'none';
    helpText.style.padding = '4px 8px';
    helpText.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    helpText.style.borderRadius = '4px';
    helpText.innerHTML = 'Left click: rotate | Right click: pan | Scroll: zoom';
    helpText.style.opacity = '0';
    helpText.style.transition = 'opacity 0.3s';
    containerRef.current.appendChild(helpText);
    
    containerRef.current.addEventListener('mouseenter', () => {
      helpText.style.opacity = '1';
    });
    
    containerRef.current.addEventListener('mouseleave', () => {
      helpText.style.opacity = '0';
    });

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

    // Add axes helper (x=red, y=green, z=blue)
    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    // Add a subtle point light at origin for extra glow effect
    const pointLight = new THREE.PointLight(0x00ffff, 0.6, 10);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Animation
    let frame = 0;
    const animate = () => {
      frame += 0.005;
      
      // Pulse the point sizes
      material.size = 0.2 + Math.sin(frame * 2) * 0.05;
      
      // Pulse the point light intensity
      pointLight.intensity = 0.6 + Math.sin(frame) * 0.2;
      
      // Update controls
      controls.update();
      
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      updateDimensions();
      
      if (containerRef.current) {
        camera.aspect = dimensions.width / dimensions.height;
        camera.updateProjectionMatrix();
        renderer.setSize(dimensions.width, dimensions.height);
      }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isAutoRotating, dimensions.width, dimensions.height]);

  return (
    <div className="relative">
      <div 
        ref={containerRef} 
        className="w-full h-[400px] bg-[#000033] rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.2)] border border-[rgba(0,255,255,0.1)]" 
      />
      <div className="flex justify-end mt-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8"
          onClick={() => setIsAutoRotating(prev => !prev)}
        >
          {isAutoRotating ? "Stop Auto-Rotation" : "Enable Auto-Rotation"}
        </Button>
      </div>
    </div>
  );
}

export default function DataViewerPage() {
  const [currentTab, setCurrentTab] = useState("aircraft");

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
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <Button variant="ghost" asChild className="text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <div className="w-[100px]" /> {/* Spacer for alignment */}
        </div>

        {/* Main Content */}
        <Card className="bg-card shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between px-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <PlaneTakeoff className="h-6 w-6" />
              Data Viewer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="aircraft" value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="w-full justify-start rounded-none bg-transparent px-4">
                  <TabsTrigger value="aircraft">Aircraft Types</TabsTrigger>
                  <TabsTrigger value="airports">Airports</TabsTrigger>
                  <TabsTrigger value="airportList">Airport List</TabsTrigger>
                  <TabsTrigger value="obstructions">Obstructions</TabsTrigger>
                  <TabsTrigger value="terrain">Terrain</TabsTrigger>
                  <TabsTrigger value="runways">Runways</TabsTrigger>
                  <TabsTrigger value="coastlines">Coastlines</TabsTrigger>
                </TabsList>

              {/* Aircraft Types */}
              <TabsContent value="aircraft" className="p-4">
                <h2 className="text-xl font-semibold mb-4">Aircraft Types</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Cruise Speed (kt)</TableHead>
                      <TableHead className="text-right">Fuel Burn (gal/hr)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraftTypes.types.map((aircraft) => (
                      <TableRow key={aircraft.id}>
                        <TableCell className="font-mono">{aircraft.id}</TableCell>
                        <TableCell>{aircraft.label}</TableCell>
                        <TableCell className="text-right">{aircraft.cruiseSpeed}</TableCell>
                        <TableCell className="text-right">{aircraft.fuelBurn.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Airports */}
              <TabsContent value="airports" className="p-4">
                <h2 className="text-xl font-semibold mb-4">Airports</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead className="text-right">Latitude</TableHead>
                      <TableHead className="text-right">Longitude</TableHead>
                      <TableHead>Runways</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(airports).map(([id, data]) => (
                      <TableRow key={id}>
                        <TableCell className="font-mono">{id}</TableCell>
                        <TableCell className="text-right">{data.coordinates.lat.toFixed(4)}</TableCell>
                        <TableCell className="text-right">{data.coordinates.lon.toFixed(4)}</TableCell>
                        <TableCell>
                          {data.runways.map(rw => `${rw.id} (${rw.heading}°)`).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Airport List */}
              <TabsContent value="airportList" className="p-4">
                <h2 className="text-xl font-semibold mb-4">Airport List</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Elevation (ft)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(terrain.airports).map(([id, data]) => (
                      <TableRow key={id}>
                        <TableCell className="font-mono">{id}</TableCell>
                        <TableCell>{data.name}</TableCell>
                        <TableCell className="text-right">{data.elevation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Obstructions */}
              <TabsContent value="obstructions" className="p-4">
                <h2 className="text-xl font-semibold mb-4">Obstructions</h2>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Latitude</TableHead>
                        <TableHead className="text-right">Longitude</TableHead>
                        <TableHead className="text-right">Height (ft)</TableHead>
                        <TableHead className="text-right">Elevation (ft)</TableHead>
                        <TableHead>Lighting</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {obstructions.obstructions.map((obstruction, index) => (
                        <TableRow key={index}>
                          <TableCell>{obstruction.type}</TableCell>
                          <TableCell className="text-right">{obstruction.lat.toFixed(4)}</TableCell>
                          <TableCell className="text-right">{obstruction.lon.toFixed(4)}</TableCell>
                          <TableCell className="text-right">{obstruction.height}</TableCell>
                          <TableCell className="text-right">{obstruction.elevation}</TableCell>
                          <TableCell>{obstruction.lighting}</TableCell>
                          <TableCell>{obstruction.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Terrain */}
              <TabsContent value="terrain" className="p-4">
                <h2 className="text-xl font-semibold mb-4">3D Interactive Terrain Model</h2>
                <div className="grid grid-cols-1 gap-6 mb-4">
                  <div className="bg-black/10 p-4 rounded-lg">
                    <div className="text-sm font-medium mb-3">Terrain Point Cloud</div>
                    <TerrainVisualization />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="overflow-auto">
                      <h3 className="text-lg font-medium mb-3">Terrain Grid Points</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">Latitude</TableHead>
                            <TableHead className="text-right">Longitude</TableHead>
                            <TableHead className="text-right">Elevation (ft)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {terrain.terrain_grid.slice(0, 15).map((point, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-right">{point.lat.toFixed(4)}</TableCell>
                              <TableCell className="text-right">{point.lon.toFixed(4)}</TableCell>
                              <TableCell className="text-right">{point.elevation}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {terrain.terrain_grid.length > 15 && (
                        <p className="text-center text-muted-foreground text-sm mt-2">
                          (Showing 15 of {terrain.terrain_grid.length} terrain points)
                        </p>
                      )}
                    </div>
                    <div className="overflow-auto">
                      <h3 className="text-lg font-medium mb-3">Terrain Statistics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/5 p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">Elevation Range</div>
                          <div className="font-mono text-lg">
                            {Math.min(...terrain.terrain_grid.map(p => p.elevation))}ft - {Math.max(...terrain.terrain_grid.map(p => p.elevation))}ft
                          </div>
                        </div>
                        <div className="bg-black/5 p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">Data Points</div>
                          <div className="font-mono text-lg">{terrain.terrain_grid.length}</div>
                        </div>
                        <div className="bg-black/5 p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">Area Coverage</div>
                          <div className="font-mono text-lg">
                            {(Math.max(...terrain.terrain_grid.map(p => p.lat)) - Math.min(...terrain.terrain_grid.map(p => p.lat))).toFixed(2)}° x {(Math.max(...terrain.terrain_grid.map(p => p.lon)) - Math.min(...terrain.terrain_grid.map(p => p.lon))).toFixed(2)}°
                          </div>
                        </div>
                        <div className="bg-black/5 p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">Highest Point</div>
                          <div className="font-mono text-lg">
                            {Math.max(...terrain.terrain_grid.map(p => p.elevation))}ft
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Runways */}
              <TabsContent value="runways" className="p-4">
                <h2 className="text-xl font-semibold mb-4">Runways</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Airport</TableHead>
                      <TableHead>Runway</TableHead>
                      <TableHead className="text-right">Length (ft)</TableHead>
                      <TableHead className="text-right">Width (ft)</TableHead>
                      <TableHead className="text-right">Heading</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(runways).map(([airport, data]) => (
                      data.runways.map((runway) => (
                        <TableRow key={`${airport}-${runway.id}`}>
                          <TableCell className="font-mono">{airport}</TableCell>
                          <TableCell>{runway.id}</TableCell>
                          <TableCell className="text-right">{runway.length}</TableCell>
                          <TableCell className="text-right">{runway.width}</TableCell>
                          <TableCell className="text-right">{runway.heading}°</TableCell>
                        </TableRow>
                      ))
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Coastlines */}
              <TabsContent value="coastlines" className="p-4">
                <h2 className="text-xl font-semibold mb-4">Coastlines</h2>
                <div className="flex flex-col lg:flex-row gap-6 mb-4">
                  <div className="flex-shrink-0">
                    <CoastlineVisualization />
                  </div>
                  <div className="flex-grow overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead className="text-right">Start Coordinates</TableHead>
                          <TableHead className="text-right">End Coordinates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coastline.features.map((feature, index) => (
                          <TableRow key={index}>
                            <TableCell>{feature.properties.name}</TableCell>
                            <TableCell>{feature.geometry.coordinates.length} points</TableCell>
                            <TableCell className="text-right">
                              {feature.geometry.coordinates[0][1].toFixed(4)}°N, {Math.abs(feature.geometry.coordinates[0][0]).toFixed(4)}°W
                            </TableCell>
                            <TableCell className="text-right">
                              {feature.geometry.coordinates[feature.geometry.coordinates.length - 1][1].toFixed(4)}°N, {Math.abs(feature.geometry.coordinates[feature.geometry.coordinates.length - 1][0]).toFixed(4)}°W
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}