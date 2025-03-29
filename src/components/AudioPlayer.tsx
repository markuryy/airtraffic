import { useEffect, useRef } from 'react';

interface AudioPlayerProps {
  takeoffSoundUrl: string;
  sonicBoomSoundUrl: string;
}

export default function AudioPlayer({ takeoffSoundUrl, sonicBoomSoundUrl }: AudioPlayerProps) {
  const takeoffAudioRef = useRef<HTMLAudioElement | null>(null);
  const sonicBoomAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    console.log('Initializing audio elements with:', { takeoffSoundUrl, sonicBoomSoundUrl });
    
    // Create audio elements in the DOM
    const takeoffAudio = document.createElement('audio');
    takeoffAudio.src = takeoffSoundUrl;
    takeoffAudio.id = 'takeoff-sound';
    takeoffAudio.preload = 'auto';
    
    const sonicBoomAudio = document.createElement('audio');
    sonicBoomAudio.src = sonicBoomSoundUrl;
    sonicBoomAudio.id = 'sonic-boom-sound';
    sonicBoomAudio.preload = 'auto';
    
    // Add to DOM
    document.body.appendChild(takeoffAudio);
    document.body.appendChild(sonicBoomAudio);
    
    // Store refs
    takeoffAudioRef.current = takeoffAudio;
    sonicBoomAudioRef.current = sonicBoomAudio;

    // Add event listeners for debugging
    takeoffAudio.addEventListener('play', () => console.log('Takeoff sound started playing'));
    takeoffAudio.addEventListener('error', (e) => console.error('Takeoff sound error:', e));
    sonicBoomAudio.addEventListener('play', () => console.log('Sonic boom sound started playing'));
    sonicBoomAudio.addEventListener('error', (e) => console.error('Sonic boom sound error:', e));

    // Cleanup
    return () => {
      console.log('Cleaning up audio elements');
      if (takeoffAudioRef.current) {
        takeoffAudioRef.current.remove();
        takeoffAudioRef.current = null;
      }
      if (sonicBoomAudioRef.current) {
        sonicBoomAudioRef.current.remove();
        sonicBoomAudioRef.current = null;
      }
    };
  }, [takeoffSoundUrl, sonicBoomSoundUrl]);

  const playTakeoff = async () => {
    console.log('Attempting to play takeoff sound');
    if (takeoffAudioRef.current) {
      try {
        takeoffAudioRef.current.currentTime = 0;
        const playPromise = takeoffAudioRef.current.play();
        if (playPromise) {
          await playPromise;
          console.log('Takeoff sound playing successfully');
        }
      } catch (error) {
        console.error('Takeoff sound playback failed:', error);
      }
    } else {
      console.warn('Takeoff audio element not found');
    }
  };

  const playSonicBoom = async () => {
    console.log('Attempting to play sonic boom sound');
    if (sonicBoomAudioRef.current) {
      try {
        sonicBoomAudioRef.current.currentTime = 0;
        const playPromise = sonicBoomAudioRef.current.play();
        if (playPromise) {
          await playPromise;
          console.log('Sonic boom sound playing successfully');
        }
      } catch (error) {
        console.error('Sonic boom sound playback failed:', error);
      }
    } else {
      console.warn('Sonic boom audio element not found');
    }
  };

  // Return JSX for the audio elements and the play functions
  return {
    playTakeoff,
    playSonicBoom
  };
} 