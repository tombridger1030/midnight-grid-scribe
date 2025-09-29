import React, { useState, useEffect } from 'react';

interface TerminalFlickerProps {
  children: React.ReactNode;
  flickerIntensity?: 'low' | 'medium' | 'high';
  enabled?: boolean;
}

const TerminalFlicker: React.FC<TerminalFlickerProps> = ({
  children,
  flickerIntensity = 'medium',
  enabled = true
}) => {
  const [flicker, setFlicker] = useState(false);
  const [scanlines, setScanlines] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const intensitySettings = {
      low: { frequency: 200, duration: 50 },
      medium: { frequency: 150, duration: 100 },
      high: { frequency: 100, duration: 150 }
    };

    const settings = intensitySettings[flickerIntensity];

    const flickerInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setFlicker(true);
        setTimeout(() => setFlicker(false), settings.duration);
      }
    }, settings.frequency);

    const scanlinesInterval = setInterval(() => {
      setScanlines(prev => !prev);
    }, 4000 + Math.random() * 2000);

    return () => {
      clearInterval(flickerInterval);
      clearInterval(scanlinesInterval);
    };
  }, [enabled, flickerIntensity]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Main content */}
      <div
        className={`transition-all duration-75 ${
          flicker ? 'brightness-150 contrast-125' : ''
        }`}
        style={{
          filter: flicker
            ? 'hue-rotate(10deg) saturate(1.2) brightness(1.1)'
            : 'none',
          textShadow: flicker
            ? '0 0 5px rgba(95, 227, 179, 0.8), 0 0 10px rgba(95, 227, 179, 0.4)'
            : 'none'
        }}
      >
        {children}
      </div>

      {/* Scanlines overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          scanlines ? 'opacity-30' : 'opacity-10'
        }`}
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(95, 227, 179, 0.03) 2px,
            rgba(95, 227, 179, 0.03) 4px
          )`
        }}
      />

      {/* CRT curvature effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 70%,
            rgba(0, 0, 0, 0.1) 100%
          )`
        }}
      />

      {/* Random static overlay */}
      {flicker && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay'
          }}
        />
      )}
    </div>
  );
};

export default TerminalFlicker;