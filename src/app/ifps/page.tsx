'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FlightTakeoff as FlightTakeoffIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getFlightPlans } from '@/lib/flightPlanStorage';
import { StoredFlightPlan } from '@/types/flightPlan';

export default function IFPSPage() {
  const [flightPlans, setFlightPlans] = useState<StoredFlightPlan[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadFlightPlans();
  }, []);

  const loadFlightPlans = () => {
    const plans = getFlightPlans();
    // Sort by submission time, newest first
    plans.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    setFlightPlans(plans);
    setLastRefresh(new Date());
  };

  const formatTime = (timeStr: string) => {
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}Z`;
  };

  const activateFlightPlan = (planId: string) => {
    // Update the flight plan status in local storage
    const updatedPlans = flightPlans.map(plan => {
      if (plan.id === planId) {
        return { ...plan, status: 'APPROVED' as const };
      }
      return plan;
    });
    localStorage.setItem('flightPlans', JSON.stringify(updatedPlans));
    setFlightPlans(updatedPlans);
  };

  const deletePlan = (planId: string) => {
    const updatedPlans = flightPlans.filter(plan => plan.id !== planId);
    localStorage.setItem('flightPlans', JSON.stringify(updatedPlans));
    setFlightPlans(updatedPlans);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="lg">
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

        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlightTakeoffIcon sx={{ fontSize: 32 }} />
              Initial Flight Plan Processing System
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadFlightPlans}
              sx={{ color: 'text.secondary' }}
            >
              Refresh
            </Button>
          </Box>

          {/* Last Refresh Time */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </Typography>

          {/* Flight Plan Strips */}
          <Stack spacing={2}>
            {flightPlans.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No flight plans submitted yet
              </Typography>
            ) : (
              flightPlans.map((plan) => (
                <Paper
                  key={plan.id}
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: plan.status === 'APPROVED' ? 'success.light' : 'background.paper',
                    borderLeft: 6,
                    borderColor: plan.status === 'APPROVED' ? 'success.main' : 'primary.main',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 4 }}>
                      {/* Aircraft and Route */}
                      <Box>
                        <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                          {plan.aircraft?.id || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {plan.departure?.id || '????'} → {plan.destination?.id || '????'}
                        </Typography>
                      </Box>

                      {/* Flight Details */}
                      <Box>
                        <Typography sx={{ fontFamily: 'monospace' }}>
                          FL{plan.altitude} {plan.speed}kt
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ETD: {formatTime(plan.etdTime)} {plan.etdDate}
                        </Typography>
                      </Box>

                      {/* Status */}
                      <Box>
                        <Typography 
                          sx={{ 
                            color: plan.status === 'APPROVED' ? 'success.dark' : 'text.primary',
                            fontWeight: 'medium'
                          }}
                        >
                          {plan.status}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {plan.id}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Stack direction="row" spacing={1}>
                      {plan.status === 'PENDING' && (
                        <Tooltip title="Activate Flight Plan">
                          <IconButton
                            color="success"
                            onClick={() => activateFlightPlan(plan.id)}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => deletePlan(plan.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Paper>
              ))
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
} 