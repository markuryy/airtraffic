import Link from 'next/link';
import dynamic from 'next/dynamic';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { Globe } from '@/components/magicui/globe';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
       <div className="max-w-7xl mx-auto relative z-10">
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
           <div className="order-1 lg:order-2 relative h-[400px] z-0">
             <Globe className="absolute inset-0" />
           </div>
         </div>
       </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            href="/air-traffic"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Air Traffic Control Radar</h2>
            <div className="text-gray-600 space-y-4">
              <p className="mb-3">
                A radar simulation leveraging real-world geospatial data and aeronautical calculations 
                to create realistic aircraft behavior in the Buffalo-Niagara airspace.
              </p>
              
              <div>
                <h3 className="text-gray-800 font-medium mb-2">Geospatial Calculations</h3>
                <div className="text-sm space-y-2 mb-4">
                  <p>• Real-time position updates using Turf.js destination calculations based on heading and speed</p>
                  <p>• Dynamic bearing calculations for aircraft navigation to clicked points</p>
                  <p>• Coordinate conversion between screen and real-world positions</p>
                </div>

                <h3 className="text-gray-800 font-medium mb-2">Geographic Data Integration</h3>
                <div className="text-sm space-y-2 mb-4">
                  <p>• Airport data with runway positions and headings</p>
                  <p>• Terrain elevation mapping with MSL heights</p>
                  <p>• Obstruction data with precise locations and heights</p>
                </div>

                <h3 className="text-gray-800 font-medium mb-2">Safety Features</h3>
                <div className="text-sm space-y-2">
                  <p>• Low altitude alerts based on terrain elevation</p>
                  <p>• Minimum descent altitude checked against nearest terrain elevation data point based on current position</p>
                  <p>• Obstruction proximity warnings within 1nm laterally and 500ft vertically</p>
                  <p>• Visual indicators for altitude changes and approach phases</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
                  Launch Interactive Simulation →
                </button>
              </div>
            </div>
          </Link>

          <Link 
            href="/flight-planner"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Flight Plan</h2>
            <div className="text-gray-600 space-y-4">
              <p className="mb-3">
                Create and validate new flight plans before submission to the central processing system. 
                Ensures all flight details meet requirements and airspace constraints before being sent 
                to IFPS for approval.
              </p>

              <div>
                <h3 className="text-gray-800 font-medium mb-2">Key Features</h3>
                <div className="text-sm space-y-2">
                  <p>• Flight plan creation and validation</p>
                  <p>• Aircraft performance checks</p>
                  <p>• Route verification</p>
                  <p>• Direct submission to IFPS</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
                  Open Flight Planner →
                </button>
              </div>
            </div>
          </Link>

          <Link 
            href="/ifps"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Initial Flight Plan Processing System</h2>
            <div className="text-gray-600 space-y-4">
              <p className="mb-3">
                The central hub where submitted flight plans await approval. Acts as a gatekeeper between 
                flight plan submission and operations, ensuring only approved plans can proceed to active 
                flight status.
              </p>
              
              <div>
                <h3 className="text-gray-800 font-medium mb-2">Key Features</h3>
                <div className="text-sm space-y-2">
                  <p>• Flight plan review and approval</p>
                  <p>• Integration with Flight Planner</p>
                  <p>• Forwards approved plans to Operations</p>
                  <p>• Flight strip generation</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
                  Open IFPS →
                </button>
              </div>
            </div>
          </Link>

          <Link 
            href="/operations"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Flight Operations Center</h2>
            <div className="text-gray-600 space-y-4">
              <p className="mb-3">
                The final stage where approved flight plans become active flights. Manages the dispatch 
                and monitoring of aircraft, tracking their progress from takeoff to landing using the 
                radar system.
              </p>
              
              <div>
                <h3 className="text-gray-800 font-medium mb-2">Key Features</h3>
                <div className="text-sm space-y-2">
                  <p>• Flight activation and dispatch</p>
                  <p>• Real-time radar tracking</p>
                  <p>• Flight progress monitoring</p>
                  <p>• Completion processing</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
                  Launch Operations Center →
                </button>
              </div>
            </div>
          </Link>

          <Link 
            href="/data"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Viewer</h2>
            <div className="text-gray-600 space-y-4">
              <p className="mb-3">
                Reference tool providing access to all underlying system data. Used by Flight Planner for 
                route creation, IFPS for plan validation, and Operations for tracking constraints and 
                requirements.
              </p>
              
              <div>
                <h3 className="text-gray-800 font-medium mb-2">Available Data</h3>
                <div className="text-sm space-y-2">
                  <p>• Aircraft performance specifications</p>
                  <p>• Airport and runway information</p>
                  <p>• Terrain and obstruction data</p>
                  <p>• System-wide reference data</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
                  Open Data Viewer →
                </button>
              </div>
            </div>
          </Link>

          <Link 
            href="/military-ops"
            className="block p-6 bg-gray-900 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold text-red-500 mb-4">Military Operations Center</h2>
            <div className="text-gray-400 space-y-4">
              <p className="mb-3">
                Secure military operations center for managing F-22 Raptor intercepts of civilian aircraft.
                Provides real-time tracking and dispatch capabilities for rapid response scenarios.
              </p>
              
              <div>
                <h3 className="text-red-400 font-medium mb-2">Capabilities</h3>
                <div className="text-sm space-y-2">
                  <p>• F-22 Raptor dispatch system</p>
                  <p>• Real-time intercept tracking</p>
                  <p>• Maximum performance flight profiles</p>
                  <p>• Combat Air Patrol management</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700">
                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                  Access Military Ops →
                </button>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
