import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">My Portfolio</h1>
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
        </div>
      </div>
    </main>
  );
}
