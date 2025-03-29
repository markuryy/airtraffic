'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Stack,
  Divider,
  InputAdornment,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Menu as MenuIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  FlightTakeoff as FlightTakeoffIcon,
  Route as RouteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import aircraftTypes from '@/data/aircraft-types.json';
import airportList from '@/data/airport-list.json';
import { validateFlightPlan, submitFlightPlan, calculateFuelRequired } from '@/lib/flightPlanValidation';
import { ValidationError, StoredFlightPlan, Airport, AircraftType } from '@/types/flightPlan';
import { saveFlightPlan } from '@/lib/flightPlanStorage';
import AltitudeProfile from '@/components/AltitudeProfile';

export default function FlightPlannerPage() {
  const [formData, setFormData] = useState({
    aircraft: null as AircraftType | null,
    speed: '110',
    altitude: '080',
    altitudeInput: '080',
    fuel: '0',
    departure: null as Airport | null,
    destination: null as Airport | null,
    etdTime: '',
    etdDate: '',
    waypoints: '',
    distance: '0.0',
    ete: '00:00',
    fuelBurn: '0.0'
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<StoredFlightPlan | null>(null);

  const [fuelCalculation, setFuelCalculation] = useState<{
    totalFuel: number;
    climbFuel: number;
    cruiseFuel: number;
    descentFuel: number;
    reserveFuel: number;
  }>({ totalFuel: 0, climbFuel: 0, cruiseFuel: 0, descentFuel: 0, reserveFuel: 0 });

  // Set initial ETD to current Zulu time
  useEffect(() => {
    const now = new Date();
    now.setUTCMinutes(0, 0, 0); // Reset minutes, seconds, and milliseconds
    now.setUTCHours(now.getUTCHours() + 1); // Round up to the next hour
    const timeString = now.toISOString().slice(11, 13) + now.toISOString().slice(14, 16);
    const dateString = (now.getUTCMonth() + 1).toString().padStart(2, '0') + '/' + 
                      now.getUTCDate().toString().padStart(2, '0');
    
    setFormData(prev => ({
      ...prev,
      etdTime: timeString,
      etdDate: dateString
    }));
  }, []);

  // Update fuel calculations whenever relevant fields change
  useEffect(() => {
    if (formData.aircraft && formData.departure && formData.destination) {
      const fuelReq = calculateFuelRequired(formData);
      setFuelCalculation(fuelReq);
    }
  }, [formData.aircraft, formData.departure, formData.destination, formData.altitude, formData.speed]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleAircraftChange = (newValue: AircraftType | null) => {
    setFormData(prev => ({
      ...prev,
      aircraft: newValue,
      speed: newValue ? newValue.cruiseSpeed.toString() : prev.speed
    }));
  };

  const handleAltitudeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value.toUpperCase();
    let altitude = input;

    // Remove any non-numeric/non-'A' characters
    const cleaned = input.replace(/[^0-9A]/g, '');
    
    if (cleaned.endsWith('A')) {
      // Direct altitude entry (ends with 'A')
      const numericPart = cleaned.slice(0, -1);
      if (numericPart.length > 0) {
        // Convert to flight level format if over 1000
        if (parseInt(numericPart) >= 1000) {
          altitude = (parseInt(numericPart) / 100).toString().padStart(3, '0');
        } else {
          altitude = numericPart.padStart(3, '0');
        }
      }
    } else if (cleaned.length > 0) {
      // Flight level entry
      altitude = cleaned.slice(-3).padStart(3, '0');
    }

    setFormData(prev => ({
      ...prev,
      altitudeInput: input,
      altitude: altitude
    }));
  };

  const formatAltitudeDisplay = (altitude: string): string => {
    const numericValue = parseInt(altitude) * 100;
    return numericValue.toLocaleString() + ' ft';
  };

  const calculateTimeDifference = (): string => {
    const now = new Date();
    
    // Parse ETD time and date
    const hours = parseInt(formData.etdTime.slice(0, 2));
    const minutes = parseInt(formData.etdTime.slice(2, 4));
    const month = parseInt(formData.etdDate.split('/')[0]) - 1; // JS months are 0-based
    const day = parseInt(formData.etdDate.split('/')[1]);
    
    if (isNaN(hours) || isNaN(minutes) || isNaN(month) || isNaN(day)) {
      return '';
    }

    const etd = new Date(Date.UTC(now.getUTCFullYear(), month, day, hours, minutes));
    
    // If the date is in the past for the current year, assume next year
    if (etd < now) {
      etd.setUTCFullYear(now.getUTCFullYear() + 1);
    }
    
    const diffMs = etd.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours < 0 || diffMinutes < 0) {
      return '';
    }

    if (diffHours === 0) {
      return `in ${diffMinutes}m`;
    } else {
      return `in ${diffHours}h ${diffMinutes}m`;
    }
  };

  const handleValidate = async () => {
    const errors = await validateFlightPlan(formData);
    setValidationErrors(errors);
    setValidationSuccess(errors.length === 0);
    
    if (errors.length === 0) {
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true);
    
    if (!validationSuccess) {
      // If not validated, run validation first
      const isValid = await handleValidate();
      if (!isValid) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await submitFlightPlan(formData);
      if (result.success) {
        // Save to local storage
        const storedPlan = saveFlightPlan(formData);
        
        // Reset form state
        setValidationErrors([]);
        setValidationSuccess(false);
        setHasAttemptedSubmit(false);
        
        // Show success message
        setSubmitSuccess(storedPlan);
      }
    } catch (error) {
      console.error('Error submitting flight plan:', error);
      setValidationErrors([{ field: 'submit', message: 'Failed to submit flight plan' }]);
      setValidationSuccess(false);
      setSubmitSuccess(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          {/* Back to Home Link */}
          <Box sx={{ mb: 3 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button
                startIcon={<ArrowBackIcon />}
                sx={{ color: 'text.secondary' }}
              >
                Back to Home
              </Button>
            </Link>
          </Box>

          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlightTakeoffIcon sx={{ fontSize: 32 }} />
              Flight Plan
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="New Plan">
                <IconButton>
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Menu">
                <IconButton>
                  <MenuIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Save">
                <IconButton>
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share">
                <IconButton>
                  <ShareIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Aircraft Details */}
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Autocomplete
                options={aircraftTypes.types}
                value={formData.aircraft}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    const matchedType = aircraftTypes.types.find(type => type.id === newValue.toUpperCase());
                    handleAircraftChange(matchedType || null);
                  } else {
                    handleAircraftChange(newValue);
                  }
                }}
                sx={{ width: 200 }}
                freeSolo
                autoSelect
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option?.id || '';
                }}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Typography sx={{ fontFamily: 'monospace', mr: 1 }}>{option.id}</Typography>
                      <Typography color="text.secondary">- {option.label}</Typography>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Aircraft" 
                    size="small"
                    inputProps={{
                      ...params.inputProps,
                      style: { fontFamily: 'monospace', textTransform: 'uppercase' }
                    }}
                  />
                )}
                onInputChange={(_, value) => {
                  const upperValue = value.toUpperCase();
                  const matchedType = aircraftTypes.types.find(type => type.id === upperValue);
                  if (matchedType) {
                    handleAircraftChange(matchedType);
                  }
                }}
              />
              <TextField
                label="Speed"
                value={formData.speed}
                onChange={handleChange('speed')}
                sx={{ width: 100 }}
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">kt</InputAdornment>,
                }}
              />
              <TextField
                label="Altitude"
                value={formData.altitudeInput}
                onChange={handleAltitudeChange}
                sx={{ width: 140 }}
                size="small"
                InputProps={{
                  endAdornment: (
                    <Tooltip title="Enter flight level (080) or append 'A' for direct altitude (8000A)">
                      <InputAdornment position="end">
                        {formatAltitudeDisplay(formData.altitude)}
                      </InputAdornment>
                    </Tooltip>
                  ),
                  style: { fontFamily: 'monospace' }
                }}
                placeholder="080"
              />
              <TextField
                label="Fuel"
                value={formData.fuel}
                onChange={handleChange('fuel')}
                sx={{ width: 100 }}
                size="small"
                InputProps={{
                  endAdornment: (
                    <Tooltip title={`Required fuel breakdown:
• Climb: ${fuelCalculation.climbFuel.toFixed(1)} gal
• Cruise: ${fuelCalculation.cruiseFuel.toFixed(1)} gal
• Descent: ${fuelCalculation.descentFuel.toFixed(1)} gal
• Reserve: ${fuelCalculation.reserveFuel.toFixed(1)} gal
Total: ${fuelCalculation.totalFuel.toFixed(1)} gal`}>
                      <InputAdornment position="end">gal</InputAdornment>
                    </Tooltip>
                  ),
                }}
                error={formData.fuel !== '' && parseFloat(formData.fuel) < fuelCalculation.totalFuel}
                helperText={formData.fuel !== '' && parseFloat(formData.fuel) < fuelCalculation.totalFuel ? 
                  `Minimum ${fuelCalculation.totalFuel.toFixed(1)} gal required` : ''}
              />
            </Box>

            {/* Route */}
            <Stack spacing={2} direction="row">
              <Autocomplete
                options={airportList.airports}
                value={formData.departure}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    const matchedAirport = airportList.airports.find(a => a.id === newValue.toUpperCase());
                    setFormData(prev => ({ ...prev, departure: matchedAirport || null }));
                  } else {
                    setFormData(prev => ({ ...prev, departure: newValue }));
                  }
                }}
                sx={{ width: 140 }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Departure" 
                    size="small"
                    inputProps={{
                      ...params.inputProps,
                      style: { fontFamily: 'monospace', textTransform: 'uppercase' }
                    }}
                  />
                )}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option?.id || '';
                }}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Typography sx={{ fontFamily: 'monospace', mr: 1 }}>{option.id}</Typography>
                      <Typography color="text.secondary">- {option.name}</Typography>
                    </Box>
                  );
                }}
                freeSolo
                autoSelect
              />
              <Typography variant="h6" color="text.secondary" sx={{ mx: 1 }}>→</Typography>
              <Autocomplete
                options={airportList.airports}
                value={formData.destination}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    const matchedAirport = airportList.airports.find(a => a.id === newValue.toUpperCase());
                    setFormData(prev => ({ ...prev, destination: matchedAirport || null }));
                  } else {
                    setFormData(prev => ({ ...prev, destination: newValue }));
                  }
                }}
                sx={{ width: 140 }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Destination" 
                    size="small"
                    inputProps={{
                      ...params.inputProps,
                      style: { fontFamily: 'monospace', textTransform: 'uppercase' }
                    }}
                  />
                )}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option?.id || '';
                }}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Typography sx={{ fontFamily: 'monospace', mr: 1 }}>{option.id}</Typography>
                      <Typography color="text.secondary">- {option.name}</Typography>
                    </Box>
                  );
                }}
                freeSolo
                autoSelect
              />
            </Stack>

            {/* Time */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Stack spacing={2} sx={{ flex: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">ETD (Zulu)</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    placeholder="HHMM"
                    value={formData.etdTime}
                    onChange={handleChange('etdTime')}
                    size="small"
                    sx={{ width: 100 }}
                    inputProps={{
                      style: { fontFamily: 'monospace' }
                    }}
                  />
                  <TextField
                    placeholder="MM/DD"
                    value={formData.etdDate}
                    onChange={handleChange('etdDate')}
                    size="small"
                    sx={{ width: 100 }}
                    inputProps={{
                      style: { fontFamily: 'monospace' }
                    }}
                  />
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      ml: 2,
                      minWidth: 80,
                      fontFamily: 'monospace'
                    }}
                  >
                    {calculateTimeDifference()}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Route Planning */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Stack spacing={1} sx={{ width: 120 }}>
                <Typography variant="body2" color="text.secondary">
                  Distance: {formData.distance} nm
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ETE: {formData.ete}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fuel Burn: {formData.fuelBurn} gal
                </Typography>
              </Stack>
              <Box sx={{ flex: 1 }}>
                <TextField
                  multiline
                  rows={4}
                  placeholder="Enter waypoints here..."
                  value={formData.waypoints}
                  onChange={handleChange('waypoints')}
                  fullWidth
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>
              <Box sx={{ width: 120, display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<RouteIcon />}
                  fullWidth
                  size="small"
                >
                  Routes
                </Button>
              </Box>
            </Box>

            {/* Altitude Profile */}
            {formData.departure && formData.destination && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Altitude Profile
                </Typography>
                <AltitudeProfile
                  departure={formData.departure}
                  destination={formData.destination}
                  altitude={formData.altitude}
                  aircraftSpeed={parseInt(formData.speed)}
                />
              </Box>
            )}

            {/* Validation Status */}
            {hasAttemptedSubmit && !validationSuccess && !validationErrors.length && (
              <Box sx={{ mt: 2, bgcolor: 'info.light', p: 2, borderRadius: 1 }}>
                <Typography color="info.contrastText" variant="subtitle2">
                  Please validate your flight plan before submitting
                </Typography>
              </Box>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography color="error" variant="subtitle2" gutterBottom>
                  Please correct the following errors:
                </Typography>
                <ul style={{ color: '#d32f2f', margin: 0 }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </Box>
            )}

            {/* Validation Success */}
            {validationSuccess && !submitSuccess && (
              <Box sx={{ mt: 2, bgcolor: 'success.light', p: 2, borderRadius: 1 }}>
                <Typography color="success.contrastText" variant="subtitle2" gutterBottom>
                  ✓ Flight Plan Validation Successful
                </Typography>
                <Box component="ul" sx={{ color: 'success.contrastText', m: 0, pl: 2 }}>
                  <li>Aircraft type "{formData.aircraft?.id}" is valid</li>
                  <li>Speed {formData.speed}kt is within acceptable range</li>
                  <li>Altitude {formatAltitudeDisplay(formData.altitude)} is above minimum</li>
                  <li>Fuel quantity {formData.fuel}gal is sufficient</li>
                  <li>Valid route: {formData.departure?.id} → {formData.destination?.id}</li>
                  <li>ETD {formData.etdTime} {formData.etdDate}Z is properly formatted</li>
                </Box>
              </Box>
            )}

            {/* Submit Success */}
            {submitSuccess && (
              <Box sx={{ mt: 2, bgcolor: 'success.light', p: 2, borderRadius: 1 }}>
                <Typography color="success.contrastText" variant="subtitle2" gutterBottom>
                  ✓ Flight Plan Submitted Successfully
                </Typography>
                <Box sx={{ color: 'success.contrastText', mt: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    Flight Plan ID: {submitSuccess.id}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    From: {submitSuccess.departure?.id} → To: {submitSuccess.destination?.id}
                  </Typography>
                  <Typography variant="body2">
                    ETD: {submitSuccess.etdTime}Z {submitSuccess.etdDate}
                  </Typography>
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Button
                variant="outlined"
                size="large"
                onClick={handleValidate}
                disabled={isSubmitting}
              >
                Validate Plan
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={isSubmitting}
                color={validationSuccess ? "primary" : "inherit"}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Plan'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
} 