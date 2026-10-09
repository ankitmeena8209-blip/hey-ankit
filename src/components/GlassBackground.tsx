import React, { useEffect, useRef } from 'react';

interface GlassBackgroundProps {
  screen?: 'welcome' | 'auth' | 'chat' | 'admin';
}

export const GlassBackground: React.FC<GlassBackgroundProps> = ({ screen = 'welcome' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spot = spotRef.current;
    if (!spot) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isRunning = false;

    const animate = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;
      if (spot) {
        spot.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
      }
      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.5) {
        requestAnimationFrame(animate);
      } else {
        isRunning = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      spot.style.opacity = '0.85';
      if (!isRunning) {
        isRunning = true;
        requestAnimationFrame(animate);
      }
    };

    const handlePointerLeave = () => {
      if (spot) spot.style.opacity = '0';
    };

    const parent = containerRef.current?.parentElement;
    if (parent) {
      parent.addEventListener('pointermove', handlePointerMove);
      parent.addEventListener('pointerleave', handlePointerLeave);
    }

    return () => {
      if (parent) {
        parent.removeEventListener('pointermove', handlePointerMove);
        parent.removeEventListener('pointerleave', handlePointerLeave);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0" data-s={screen}>
      {/* Dynamic Ambient Gradient Orbs */}
      <div className="bg absolute -inset-[12%] z-0 pointer-events-none">
        <div className="orb o1"><i /></div>
        <div className="orb o2"><i /></div>
        <div className="orb o3"><i /></div>
      </div>

      {/* Atmospheric Soft Veil */}
      <div className="veil absolute inset-0 z-[1] pointer-events-none" />

      {/* Cursor Radial Spotlight */}
      <div ref={spotRef} className="spot absolute left-0 top-0 pointer-events-none opacity-0 transition-opacity duration-300" />
    </div>
  );
};
