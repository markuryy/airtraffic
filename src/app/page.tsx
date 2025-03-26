'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { RainbowButton } from '@/components/magicui/rainbow-button';

// Dynamically import the Globe component with SSR disabled to prevent hydration errors
const Globe = dynamic(() => import('@/components/magicui/globe').then(mod => mod.Globe), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center">Loading globe...</div>
});

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="order-2 lg:order-1">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500">
              Air Traffic Control Radar
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
          <div className="order-1 lg:order-2 relative h-[400px] z-0">
            <Globe className="absolute inset-0" />
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-20">
          {/* Geospatial Calculations Card */}
          <div className="bg-card rounded-xl p-6 shadow-lg border border-border/50 hover:border-primary/20 transition-all hover:shadow-primary/5">
            <h2 className="text-lg sm:text-xl font-semibold text-primary mb-3 sm:mb-4">Geospatial Calculations</h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-card-foreground/80">
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Real-time position updates using Turf.js destination calculations based on heading and speed</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Dynamic bearing calculations for aircraft navigation to clicked points</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Coordinate conversion between screen and real-world positions</span>
              </p>
            </div>
          </div>

          {/* Geographic Data Integration Card */}
          <div className="bg-card rounded-xl p-6 shadow-lg border border-border/50 hover:border-primary/20 transition-all hover:shadow-primary/5">
            <h2 className="text-lg sm:text-xl font-semibold text-primary mb-3 sm:mb-4">Geographic Data Integration</h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-card-foreground/80">
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Airport data with runway positions and headings</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Terrain elevation mapping with MSL heights</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Obstruction data with precise locations and heights</span>
              </p>
            </div>
          </div>

          {/* Safety Features Card */}
          <div className="bg-card rounded-xl p-6 shadow-lg border border-border/50 hover:border-primary/20 transition-all hover:shadow-primary/5">
            <h2 className="text-lg sm:text-xl font-semibold text-primary mb-3 sm:mb-4">Safety Features</h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-card-foreground/80">
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Low altitude alerts based on terrain elevation</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Minimum descent altitude checked against nearest terrain elevation data point</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Obstruction proximity warnings within 1nm laterally and 500ft vertically</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <span>Visual indicators for altitude changes and approach phases</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/80 pointer-events-none" />
    </main>
  );
}
