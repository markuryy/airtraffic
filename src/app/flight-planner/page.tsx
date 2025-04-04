'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Menu,
  Save,
  Share,
  PlaneTakeoff,
  Route,
} from 'lucide-react';
import aircraftTypes from '@/data/aircraft-types.json';
import airportList from '@/data/airport-list.json';
import { validateFlightPlan, submitFlightPlan, calculateFuelRequired } from '@/lib/flightPlanValidation';
import { ValidationError, StoredFlightPlan, Airport, AircraftType } from '@/types/flightPlan';
import { saveFlightPlan } from '@/lib/flightPlanStorage';
import AltitudeProfile from '@/components/AltitudeProfile';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

  const [openAircraftCommand, setOpenAircraftCommand] = useState(false);
  const [openDepartureCommand, setOpenDepartureCommand] = useState(false);
  const [openDestinationCommand, setOpenDestinationCommand] = useState(false);
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
        {/* Back to Home Link */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Card className="bg-card shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between px-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <PlaneTakeoff className="h-6 w-6" />
              Flight Plan
            </CardTitle>
            <div className="flex space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New Plan</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Menu</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Share className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-6">
            {/* Aircraft Details */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="w-[200px]">
                <Popover open={openAircraftCommand} onOpenChange={setOpenAircraftCommand}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      role="combobox" 
                      className="w-full justify-between font-mono"
                    >
                      {formData.aircraft ? formData.aircraft.id : "Select Aircraft..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search aircraft..." />
                      <CommandList>
                        <CommandEmpty>No aircraft found.</CommandEmpty>
                        <CommandGroup>
                          {aircraftTypes.types.map((aircraft) => (
                            <CommandItem
                              key={aircraft.id}
                              value={aircraft.id}
                              onSelect={() => {
                                handleAircraftChange(aircraft);
                                setOpenAircraftCommand(false);
                              }}
                              className="flex justify-between"
                            >
                              <span className="font-mono">{aircraft.id}</span>
                              <span className="text-muted-foreground text-sm">- {aircraft.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center">
                <div className="relative w-[100px]">
                  <Input
                    value={formData.speed}
                    onChange={handleChange('speed')}
                    className="font-mono pr-8"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    kt
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-[140px] relative">
                        <Input
                          value={formData.altitudeInput}
                          onChange={handleAltitudeChange}
                          className="font-mono pr-16"
                          placeholder="080"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                          {formatAltitudeDisplay(formData.altitude)}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Enter flight level (080) or append &apos;A&apos; for direct altitude (8000A)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-[100px] relative">
                        <Input
                          value={formData.fuel}
                          onChange={handleChange('fuel')}
                          className={`font-mono pr-8 ${
                            formData.fuel !== '' && 
                            parseFloat(formData.fuel) < fuelCalculation.totalFuel ? 
                            'border-red-500' : ''
                          }`}
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                          gal
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1 text-sm">
                        <div>Required fuel breakdown:</div>
                        <div>• Climb: {fuelCalculation.climbFuel.toFixed(1)} gal</div>
                        <div>• Cruise: {fuelCalculation.cruiseFuel.toFixed(1)} gal</div>
                        <div>• Descent: {fuelCalculation.descentFuel.toFixed(1)} gal</div>
                        <div>• Reserve: {fuelCalculation.reserveFuel.toFixed(1)} gal</div>
                        <div>Total: {fuelCalculation.totalFuel.toFixed(1)} gal</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {formData.fuel !== '' && parseFloat(formData.fuel) < fuelCalculation.totalFuel && (
                  <div className="text-xs text-red-500 mt-1">
                    Minimum {fuelCalculation.totalFuel.toFixed(1)} gal required
                  </div>
                )}
              </div>
              
              {formData.aircraft && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          fuel: formData.aircraft!.maxFuel.toString() 
                        }))}
                      >
                        Fill Max
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Fill to maximum capacity ({formData.aircraft.maxFuel} gal)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Route */}
            <div className="flex items-center space-x-2">
              <div className="w-[140px]">
                <Popover open={openDepartureCommand} onOpenChange={setOpenDepartureCommand}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      role="combobox" 
                      className="w-full justify-between font-mono"
                    >
                      {formData.departure ? formData.departure.id : "Departure"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search airports..." />
                      <CommandList>
                        <CommandEmpty>No airports found.</CommandEmpty>
                        <CommandGroup>
                          {airportList.airports.map((airport) => (
                            <CommandItem
                              key={airport.id}
                              value={airport.id}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, departure: airport }));
                                setOpenDepartureCommand(false);
                              }}
                              className="flex justify-between"
                            >
                              <span className="font-mono">{airport.id}</span>
                              <span className="text-muted-foreground text-sm truncate ml-2">- {airport.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="text-xl text-muted-foreground">→</div>
              
              <div className="w-[140px]">
                <Popover open={openDestinationCommand} onOpenChange={setOpenDestinationCommand}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      role="combobox" 
                      className="w-full justify-between font-mono"
                    >
                      {formData.destination ? formData.destination.id : "Destination"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search airports..." />
                      <CommandList>
                        <CommandEmpty>No airports found.</CommandEmpty>
                        <CommandGroup>
                          {airportList.airports.map((airport) => (
                            <CommandItem
                              key={airport.id}
                              value={airport.id}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, destination: airport }));
                                setOpenDestinationCommand(false);
                              }}
                              className="flex justify-between"
                            >
                              <span className="font-mono">{airport.id}</span>
                              <span className="text-muted-foreground text-sm truncate ml-2">- {airport.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Time */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">ETD (Zulu)</h4>
              <div className="flex gap-3 items-center">
                <Input
                  placeholder="HHMM"
                  value={formData.etdTime}
                  onChange={handleChange('etdTime')}
                  className="w-[100px] font-mono"
                />
                <Input
                  placeholder="MM/DD"
                  value={formData.etdDate}
                  onChange={handleChange('etdDate')}
                  className="w-[100px] font-mono"
                />
                <div className="text-sm text-muted-foreground font-mono min-w-[80px]">
                  {calculateTimeDifference()}
                </div>
              </div>
            </div>

            {/* Route Planning */}
            <div className="flex gap-4">
              <div className="w-[120px] space-y-1">
                <div className="text-sm text-muted-foreground">
                  Distance: {formData.distance} nm
                </div>
                <div className="text-sm text-muted-foreground">
                  ETE: {formData.ete}
                </div>
                <div className="text-sm text-muted-foreground">
                  Fuel Burn: {formData.fuelBurn} gal
                </div>
              </div>
              <div className="flex-1">
                <Textarea
                  placeholder="Enter waypoints here..."
                  value={formData.waypoints}
                  onChange={handleChange('waypoints')}
                  className="h-24 font-mono resize-none"
                />
              </div>
              <div className="w-[120px] flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  size="sm"
                >
                  <Route className="mr-2 h-4 w-4" />
                  Routes
                </Button>
              </div>
            </div>

            {/* Altitude Profile */}
            {formData.departure && formData.destination && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Altitude Profile
                </h4>
                <AltitudeProfile
                  departure={formData.departure}
                  destination={formData.destination}
                  altitude={formData.altitude}
                  aircraftSpeed={parseInt(formData.speed)}
                />
              </div>
            )}

            {/* Validation Status */}
            {hasAttemptedSubmit && !validationSuccess && !validationErrors.length && (
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-md">
                <p className="text-blue-700 dark:text-blue-200 text-sm font-medium">
                  Please validate your flight plan before submitting
                </p>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-md">
                <p className="text-red-700 dark:text-red-200 text-sm font-medium mb-1">
                  Please correct the following errors:
                </p>
                <ul className="list-disc pl-5 text-sm text-red-600 dark:text-red-300">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Success */}
            {validationSuccess && !submitSuccess && (
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md">
                <p className="text-green-700 dark:text-green-200 text-sm font-medium mb-1">
                  ✓ Flight Plan Validation Successful
                </p>
                <ul className="list-disc pl-5 text-sm text-green-600 dark:text-green-300">
                  <li>Aircraft type &quot;{formData.aircraft?.id}&quot; is valid</li>
                  <li>Speed {formData.speed}kt is within acceptable range</li>
                  <li>Altitude {formatAltitudeDisplay(formData.altitude)} is above minimum</li>
                  <li>Fuel quantity {formData.fuel}gal is sufficient</li>
                  <li>Valid route: {formData.departure?.id} → {formData.destination?.id}</li>
                  <li>ETD {formData.etdTime} {formData.etdDate}Z is properly formatted</li>
                </ul>
              </div>
            )}

            {/* Submit Success */}
            {submitSuccess && (
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md">
                <p className="text-green-700 dark:text-green-200 text-sm font-medium mb-2">
                  ✓ Flight Plan Submitted Successfully
                </p>
                <div className="text-green-600 dark:text-green-300 text-sm space-y-1">
                  <p className="font-mono">
                    Flight Plan ID: {submitSuccess.id}
                  </p>
                  <p>
                    From: {submitSuccess.departure?.id} → To: {submitSuccess.destination?.id}
                  </p>
                  <p>
                    ETD: {submitSuccess.etdTime}Z {submitSuccess.etdDate}
                  </p>
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Actions */}
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={handleValidate}
                disabled={isSubmitting}
                className="px-6"
              >
                Validate Plan
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-6 ${validationSuccess ? "" : "opacity-70"}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}