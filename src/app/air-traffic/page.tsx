'use client';

import { useEffect, useState } from 'react';
import AirTrafficRadar from '@/components/AirTrafficRadar';

export default function AirTrafficPage() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Set initial dimensions
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Update dimensions on window resize
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <AirTrafficRadar width={dimensions.width} height={dimensions.height} />
    </div>
  );
} 