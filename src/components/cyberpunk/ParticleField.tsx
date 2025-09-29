import React, { useEffect, useRef } from 'react';

interface ParticleFieldProps {
  active?: boolean;
  particleCount?: number;
  color?: string;
  speed?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
}

const ParticleField: React.FC<ParticleFieldProps> = ({
  active = true,
  particleCount = 50,
  color = '#5FE3B3',
  speed = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
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

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        createParticle();
      }
    };

    const createParticle = () => {
      const particle: Particle = {
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 2 * speed,
        vy: -Math.random() * 3 * speed - 1,
        life: 0,
        maxLife: 60 + Math.random() * 120,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2
      };

      particlesRef.current.push(particle);
    };

    const updateParticles = () => {
      particlesRef.current = particlesRef.current.filter(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;

        // Add some turbulence
        particle.vx += (Math.random() - 0.5) * 0.1;
        particle.vy += (Math.random() - 0.5) * 0.1;

        // Fade out over time
        const lifeRatio = particle.life / particle.maxLife;
        particle.opacity = Math.max(0, particle.opacity * (1 - lifeRatio * 0.02));

        // Remove dead particles
        return particle.life < particle.maxLife &&
               particle.y > -10 &&
               particle.x > -10 &&
               particle.x < canvas.width + 10 &&
               particle.opacity > 0.01;
      });

      // Add new particles occasionally
      if (Math.random() < 0.3 && particlesRef.current.length < particleCount) {
        createParticle();
      }
    };

    const drawParticles = () => {
      ctx.save();

      particlesRef.current.forEach(particle => {
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = color;

        // Draw particle with glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = particle.size * 2;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connecting lines between nearby particles
        particlesRef.current.forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100 && distance > 0) {
            ctx.globalAlpha = (particle.opacity + otherParticle.opacity) / 2 * (1 - distance / 100);
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      updateParticles();
      drawParticles();

      animationRef.current = requestAnimationFrame(animate);
    };

    initParticles();
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, particleCount, color, speed]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{
        opacity: 0.6,
        mixBlendMode: 'screen'
      }}
    />
  );
};

export default ParticleField;