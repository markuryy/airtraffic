'use client'

import Link from 'next/link';
import { 
  PlaneTakeoffIcon, 
  ActivityIcon,
  RadarIcon,
  ServerIcon,
  BookOpenIcon,
  ShieldIcon
} from 'lucide-react';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { Globe } from '@/components/magicui/globe';
import { BentoGrid, BentoCard } from '@/components/magicui/bento-grid';
import { Separator } from '@/components/ui/separator';

export default function Home() {
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
        {/* Hero Section */}
        <div className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="order-2 lg:order-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500">
                Air Traffic Simulator
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                A radar simulation leveraging real-world geospatial data and aeronautical calculations 
                to create realistic aircraft behavior in the Buffalo-Niagara airspace.
              </p>
              <Link href="/air-traffic"> 
                <RainbowButton className="text-lg px-8 py-3">
                  Launch Interactive Simulation →
                </RainbowButton>
              </Link>
            </div>
            <div className="order-1 lg:order-2 relative h-[400px] z-[-1]">
              <Globe className="absolute inset-0" />
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="relative z-20">
          <BentoGrid>
            {/* Air Traffic Control Radar */}
            <BentoCard 
              name="Air Traffic Control Radar"
              color="blue"
              className="md:row-span-2"
              Icon={RadarIcon}
              description="A radar simulation leveraging real-world geospatial data and aeronautical calculations to create realistic aircraft behavior."
              href="/air-traffic"
              cta="Launch Interactive Simulation"
            >
              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <h4 className="font-medium group-hover:text-blue-100">Geospatial Calculations</h4>
                  <ul className="space-y-1 text-muted-foreground group-hover:text-blue-300">
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Real-time position updates using Turf.js destination calculations based on heading and speed</span>
                    </li>
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Dynamic bearing calculations for aircraft navigation to clicked points</span>
                    </li>
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Coordinate conversion between screen and real-world positions</span>
                    </li>
                  </ul>
                </div>

                <Separator className="my-4" />

                <div className="space-y-1">
                  <h4 className="font-medium group-hover:text-blue-100">Geographic Data Integration</h4>
                  <ul className="space-y-1 text-muted-foreground group-hover:text-blue-300">
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Airport data with runway positions and headings</span>
                    </li>
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Terrain elevation mapping with MSL heights</span>
                    </li>
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Obstruction data with precise locations and heights</span>
                    </li>
                  </ul>
                </div>

                <Separator className="my-4" />

                <div className="space-y-1">
                  <h4 className="font-medium group-hover:text-blue-100">Safety Features</h4>
                  <ul className="space-y-1 text-muted-foreground group-hover:text-blue-300">
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Low altitude alerts based on terrain elevation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Minimum descent altitude checked against nearest terrain point</span>
                    </li>
                    <li className="flex items-start">
                      <span className="group-hover:text-blue-400 mr-2">•</span>
                      <span>Obstruction proximity warnings within 1nm laterally and 500ft vertically</span>
                    </li>
                  </ul>
                </div>
              </div>
            </BentoCard>

            {/* Flight Plan */}
            <BentoCard 
              name="Flight Plan"
              color="indigo"
              Icon={PlaneTakeoffIcon}
              description="Create and validate new flight plans before submission to the central processing system."
              href="/flight-planner"
              cta="Open Flight Planner"
            >
              <div className="space-y-1 text-sm">
                <h4 className="font-medium group-hover:text-indigo-100">Key Features</h4>
                <ul className="space-y-1 text-muted-foreground group-hover:text-indigo-300">
                  <li className="flex items-start">
                    <span className="group-hover:text-indigo-400 mr-2">•</span>
                    <span>Flight plan creation and validation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-indigo-400 mr-2">•</span>
                    <span>Aircraft performance checks</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-indigo-400 mr-2">•</span>
                    <span>Route verification</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-indigo-400 mr-2">•</span>
                    <span>Direct submission to IFPS</span>
                  </li>
                </ul>
              </div>
            </BentoCard>

            {/* IFPS */}
            <BentoCard 
              name="Initial Flight Plan Processing"
              color="cyan"
              Icon={ServerIcon}
              description="The central hub where submitted flight plans await approval before proceeding to active flight status."
              href="/ifps"
              cta="Open IFPS"
            >
              <div className="space-y-1 text-sm">
                <h4 className="font-medium group-hover:text-cyan-100">Key Features</h4>
                <ul className="space-y-1 text-muted-foreground group-hover:text-cyan-300">
                  <li className="flex items-start">
                    <span className="group-hover:text-cyan-400 mr-2">•</span>
                    <span>Flight plan review and approval</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-cyan-400 mr-2">•</span>
                    <span>Integration with Flight Planner</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-cyan-400 mr-2">•</span>
                    <span>Forwards approved plans to Operations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-cyan-400 mr-2">•</span>
                    <span>Flight strip generation</span>
                  </li>
                </ul>
              </div>
            </BentoCard>

            {/* Data Viewer */}
            <BentoCard 
              name="Data Viewer"
              color="purple"
              Icon={BookOpenIcon}
              description="Reference tool providing access to all underlying system data for route creation and validation."
              href="/data"
              cta="Open Data Viewer"
            >
              <div className="space-y-1 text-sm">
                <h4 className="font-medium group-hover:text-purple-100">Available Data</h4>
                <ul className="space-y-1 text-muted-foreground group-hover:text-purple-300">
                  <li className="flex items-start">
                    <span className="group-hover:text-purple-400 mr-2">•</span>
                    <span>Aircraft performance specifications</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-purple-400 mr-2">•</span>
                    <span>Airport and runway information</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-purple-400 mr-2">•</span>
                    <span>Terrain and obstruction data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-purple-400 mr-2">•</span>
                    <span>System-wide reference data</span>
                  </li>
                </ul>
              </div>
            </BentoCard>

            {/* Operations */}
            <BentoCard 
              name="Flight Operations Center"
              color="green"
              Icon={ActivityIcon}
              description="The final stage where approved flight plans become active flights with dispatch and monitoring."
              href="/operations"
              cta="Launch Operations Center"
            >
              <div className="space-y-1 text-sm">
                <h4 className="font-medium group-hover:text-green-100">Key Features</h4>
                <ul className="space-y-1 text-muted-foreground group-hover:text-green-300">
                  <li className="flex items-start">
                    <span className="group-hover:text-green-400 mr-2">•</span>
                    <span>Flight activation and dispatch</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-green-400 mr-2">•</span>
                    <span>Real-time radar tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-green-400 mr-2">•</span>
                    <span>Flight progress monitoring</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-green-400 mr-2">•</span>
                    <span>Completion processing</span>
                  </li>
                </ul>
              </div>
            </BentoCard>

            {/* Military Ops */}
            <BentoCard 
              name="Military Operations Center"
              color="red"
              className="md:col-span-3"
              Icon={ShieldIcon}
              description="Secure military operations center for managing F-22 Raptor intercepts of civilian aircraft."
              href="/military-ops"
              cta="Access Military Ops"
            >
              <div className="space-y-1 text-sm">
                <h4 className="font-medium group-hover:text-red-100">Capabilities</h4>
                <ul className="space-y-1 text-muted-foreground group-hover:text-red-300">
                  <li className="flex items-start">
                    <span className="group-hover:text-red-400 mr-2">•</span>
                    <span>F-22 Raptor dispatch system</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-red-400 mr-2">•</span>
                    <span>Real-time intercept tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-red-400 mr-2">•</span>
                    <span>Maximum performance flight profiles</span>
                  </li>
                  <li className="flex items-start">
                    <span className="group-hover:text-red-400 mr-2">•</span>
                    <span>Combat Air Patrol management</span>
                  </li>
                </ul>
              </div>
            </BentoCard>
          </BentoGrid>
        </div>
      </div>
    </main>
  );
}
