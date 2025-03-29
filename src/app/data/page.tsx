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
import { useState } from 'react';
import aircraftTypes from '@/data/aircraft-types.json';
import airportList from '@/data/airport-list.json';
import airports from '@/data/airports.json';
import obstructions from '@/data/obstructions.json';
import terrain from '@/data/terrain.json';
import runways from '@/data/runways.json';

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
        </Paper>
      </Container>
    </Box>
  );
} 