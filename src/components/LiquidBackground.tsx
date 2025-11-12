import { useEffect, useRef } from 'react';

interface LiquidBackgroundProps {
  colors?: string[];
  mouseForce?: number;
  cursorSize?: number;
  autoSpeed?: number;
  autoIntensity?: number;
}

export const LiquidBackground = ({
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  mouseForce = 20,
  cursorSize = 100,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
}: LiquidBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Blob particles for fluid effect
    class Blob {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      baseX: number;
      baseY: number;

      constructor() {
        this.baseX = Math.random() * width;
        this.baseY = Math.random() * height;
        this.x = this.baseX;
        this.y = this.baseY;
        this.vx = (Math.random() - 0.5) * autoSpeed;
        this.vy = (Math.random() - 0.5) * autoSpeed;
        this.radius = Math.random() * 200 + 150;
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(time: number, mouseX: number, mouseY: number) {
        // Auto movement with sinusoidal motion
        const autoX = Math.sin(time * 0.001 * autoSpeed + this.baseX * 0.01) * autoIntensity * 50;
        const autoY = Math.cos(time * 0.001 * autoSpeed + this.baseY * 0.01) * autoIntensity * 50;

        this.x = this.baseX + autoX;
        this.y = this.baseY + autoY;

        // Mouse interaction
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < cursorSize * 3) {
          const force = (cursorSize * 3 - distance) / (cursorSize * 3);
          this.x -= (dx / distance) * force * mouseForce;
          this.y -= (dy / distance) * force * mouseForce;
        }

        // Boundary wrapping
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;

        // Update base position slowly
        this.baseX += this.vx;
        this.baseY += this.vy;

        if (this.baseX < -this.radius || this.baseX > width + this.radius) {
          this.vx *= -1;
        }
        if (this.baseY < -this.radius || this.baseY > height + this.radius) {
          this.vy *= -1;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color + 'AA');
        gradient.addColorStop(0.5, this.color + '55');
        gradient.addColorStop(1, this.color + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const blobs: Blob[] = [];
    for (let i = 0; i < 8; i++) {
      blobs.push(new Blob());
    }

    const animate = () => {
      timeRef.current += 16;

      // Clear with dark background
      ctx.fillStyle = 'rgba(15, 15, 20, 0.95)';
      ctx.fillRect(0, 0, width, height);

      // Apply blur filter
      ctx.filter = 'blur(40px)';

      blobs.forEach((blob) => {
        blob.update(timeRef.current, mouseRef.current.x, mouseRef.current.y);
        blob.draw(ctx);
      });

      ctx.filter = 'none';

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colors, mouseForce, cursorSize, autoSpeed, autoIntensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};
