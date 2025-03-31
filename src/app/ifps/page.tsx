'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  PlaneTakeoff,
  Check,
  Trash,
  RefreshCw
} from 'lucide-react';
import { getFlightPlans } from '@/lib/flightPlanStorage';
import { StoredFlightPlan } from '@/types/flightPlan';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
          <CardHeader className="flex flex-row items-center justify-between px-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <PlaneTakeoff className="h-6 w-6" />
              Initial Flight Plan Processing System
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadFlightPlans}
              className="text-muted-foreground"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            {/* Last Refresh Time */}
            <p className="text-sm text-muted-foreground mb-6">
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>

            {/* Flight Plan Strips */}
            <div className="space-y-3">
              {flightPlans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No flight plans submitted yet
                </div>
              ) : (
                flightPlans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={`
                      border-l-4 
                      ${plan.status === 'APPROVED' ? 'border-l-green-500' : 'border-l-blue-500'}
                      ${plan.status === 'APPROVED' ? 'bg-green-50 dark:bg-green-950/20' : ''}
                    `}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex gap-8">
                        {/* Aircraft and Route */}
                        <div>
                          <p className="text-lg font-mono font-medium">
                            {plan.aircraft?.id || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {plan.departure?.id || '????'} → {plan.destination?.id || '????'}
                          </p>
                        </div>

                        {/* Flight Details */}
                        <div>
                          <p className="font-mono">
                            FL{plan.altitude} {plan.speed}kt
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ETD: {formatTime(plan.etdTime)} {plan.etdDate}
                          </p>
                        </div>

                        {/* Status */}
                        <div>
                          <p className={`font-medium ${plan.status === 'APPROVED' ? 'text-green-600 dark:text-green-400' : ''}`}>
                            {plan.status}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {plan.id}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <TooltipProvider>
                          {plan.status === 'PENDING' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => activateFlightPlan(plan.id)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                >
                                  <Check className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Activate Flight Plan</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePlan(plan.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <Trash className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}