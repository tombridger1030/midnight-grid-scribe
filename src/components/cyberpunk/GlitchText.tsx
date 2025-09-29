import React, { useState, useEffect } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  glitchIntensity?: 'low' | 'medium' | 'high';
  triggerGlitch?: boolean;
}

const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  className = '',
  glitchIntensity = 'medium',
  triggerGlitch = false
}) => {
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchText, setGlitchText] = useState(text);

  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';

  const intensitySettings = {
    low: { duration: 100, frequency: 0.1 },
    medium: { duration: 200, frequency: 0.3 },
    high: { duration: 300, frequency: 0.5 }
  };

  const createGlitchText = (originalText: string) => {
    return originalText
      .split('')
      .map(char => {
        if (Math.random() < intensitySettings[glitchIntensity].frequency) {
          return glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }
        return char;
      })
      .join('');
  };

  useEffect(() => {
    if (triggerGlitch) {
      setIsGlitching(true);

      const glitchInterval = setInterval(() => {
        setGlitchText(createGlitchText(text));
      }, 50);

      const timeout = setTimeout(() => {
        clearInterval(glitchInterval);
        setGlitchText(text);
        setIsGlitching(false);
      }, intensitySettings[glitchIntensity].duration);

      return () => {
        clearInterval(glitchInterval);
        clearTimeout(timeout);
      };
    }
  }, [triggerGlitch, text, glitchIntensity]);

  return (
    <span
      className={`${className} ${isGlitching ? 'animate-pulse' : ''}`}
      style={{
        textShadow: isGlitching
          ? '2px 0 #ff00ff, -2px 0 #00ffff, 0 2px #ffff00'
          : undefined,
      }}
    >
      {glitchText}
    </span>
  );
};

export default GlitchText;