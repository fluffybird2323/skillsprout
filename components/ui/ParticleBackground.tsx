import React, { useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  alpha: number;
}

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor(window.innerWidth * 0.03); // Responsive density
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2, // Slow drift
          vy: (Math.random() - 0.5) * 0.2,
          width: Math.random() * 60 + 20, // 20px to 80px width
          height: Math.random() * 60 + 20,
          alpha: Math.random() * 0.05 + 0.02, // Very subtle opacity
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Theme colors
      const particleColor = theme === 'dark' ? '255, 255, 255' : '18, 19, 23';
      
      particles.forEach(p => {
        ctx.beginPath();
        // Pill shape logic
        const radius = Math.min(p.width, p.height) / 2;
        ctx.roundRect(p.x, p.y, p.width, p.height, radius);
        ctx.fillStyle = `rgba(${particleColor}, ${p.alpha})`;
        ctx.fill();

        // Update Position
        p.x += p.vx;
        p.y += p.vy;

        // Screen wrap
        if (p.x < -100) p.x = canvas.width + 100;
        if (p.x > canvas.width + 100) p.x = -100;
        if (p.y < -100) p.y = canvas.height + 100;
        if (p.y > canvas.height + 100) p.y = -100;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
    />
  );
};
