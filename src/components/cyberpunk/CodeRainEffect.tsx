import React, { useEffect, useRef } from 'react';

interface CodeRainEffectProps {
  active?: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

const CodeRainEffect: React.FC<CodeRainEffectProps> = ({
  active = true,
  intensity = 'medium'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Code characters - mix of binary, hex, and symbols
    const chars = '01ABCDEF{}[]()<>+-*/=!@#$%^&*|\\?~`';
    const charArray = chars.split('');

    const fontSize = 12;
    const columns = Math.floor(canvas.width / fontSize);

    // Drop settings based on intensity
    const intensitySettings = {
      low: { speed: 0.02, density: 0.7 },
      medium: { speed: 0.03, density: 0.85 },
      high: { speed: 0.05, density: 0.95 }
    };

    const settings = intensitySettings[intensity];

    // Array to track each column's state
    const drops: Array<{
      y: number;
      speed: number;
      chars: string[];
      opacity: number;
    }> = [];

    // Initialize drops
    for (let x = 0; x < columns; x++) {
      drops[x] = {
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random() * 1.5,
        chars: Array(20).fill(0).map(() =>
          charArray[Math.floor(Math.random() * charArray.length)]
        ),
        opacity: Math.random()
      };
    }

    const draw = () => {
      // Semi-transparent black background for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set font
      ctx.font = `${fontSize}px "Courier New", monospace`;
      ctx.textAlign = 'center';

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];

        // Draw each character in the drop
        for (let j = 0; j < drop.chars.length; j++) {
          const y = drop.y - (j * fontSize);
          if (y > canvas.height || y < 0) continue;

          // Color gradient effect
          const alpha = Math.max(0, 1 - (j * 0.1)) * drop.opacity;

          if (j === 0) {
            // Brightest character at the front
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          } else if (j < 3) {
            // Bright green for recent characters
            ctx.fillStyle = `rgba(95, 227, 179, ${alpha})`;
          } else {
            // Darker green for tail
            ctx.fillStyle = `rgba(78, 180, 255, ${alpha * 0.7})`;
          }

          ctx.fillText(
            drop.chars[j],
            i * fontSize + fontSize / 2,
            y
          );
        }

        // Update drop
        drop.y += drop.speed * settings.speed * 60; // 60fps normalization

        // Reset drop when it goes off screen or randomly
        if (drop.y > canvas.height + 100 || Math.random() > settings.density) {
          drop.y = -100;
          drop.speed = 0.5 + Math.random() * 1.5;
          drop.opacity = 0.3 + Math.random() * 0.7;

          // Refresh some characters
          for (let k = 0; k < drop.chars.length; k++) {
            if (Math.random() > 0.7) {
              drop.chars[k] = charArray[Math.floor(Math.random() * charArray.length)];
            }
          }
        }

        // Occasionally change characters for glitch effect
        if (Math.random() > 0.98) {
          const randomIndex = Math.floor(Math.random() * drop.chars.length);
          drop.chars[randomIndex] = charArray[Math.floor(Math.random() * charArray.length)];
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, intensity]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        opacity: 0.4,
        mixBlendMode: 'screen'
      }}
    />
  );
};

export default CodeRainEffect;