import { useEffect, useRef } from "react";

interface ParticleBackgroundProps {
  shameLevel: number; // 0-4
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

const CONFIGS = [
  { count: 30, speed: 0.3, hueRange: [0, 0], saturation: 0, lightness: 40 },       // Novice: dim grey
  { count: 45, speed: 0.5, hueRange: [50, 60], saturation: 70, lightness: 55 },     // Intermediate: yellow
  { count: 60, speed: 0.8, hueRange: [25, 40], saturation: 80, lightness: 55 },     // Senior: orange
  { count: 80, speed: 1.2, hueRange: [0, 15], saturation: 85, lightness: 50 },      // Staff: red
  { count: 120, speed: 1.8, hueRange: [0, 10], saturation: 90, lightness: 40 },     // Architect: dark red fire
];

export default function ParticleBackground({ shameLevel }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const configIdx = Math.min(Math.max(shameLevel, 0), 4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cfg = CONFIGS[configIdx];

    const particles: Particle[] = [];
    for (let i = 0; i < cfg.count; i++) {
      const hue = cfg.hueRange[0] + Math.random() * (cfg.hueRange[1] - cfg.hueRange[0]);
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * cfg.speed,
        vy: -Math.random() * cfg.speed - 0.1,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        hue,
      });
    }
    particlesRef.current = particles;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        if (cfg.saturation === 0) {
          ctx.fillStyle = `rgba(100, 100, 100, ${p.opacity})`;
        } else {
          ctx.fillStyle = `hsla(${p.hue}, ${cfg.saturation}%, ${cfg.lightness}%, ${p.opacity})`;
        }
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [configIdx]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
