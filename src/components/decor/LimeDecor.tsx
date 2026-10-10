import React, { useEffect, useRef } from 'react';

interface DecorProps {
  screen: 'welcome' | 'auth' | 'chat' | 'inbox';
}

export const LimeDecor: React.FC<DecorProps> = ({ screen }) => {
  const eyesRef = useRef<HTMLDivElement>(null);
  const p1Ref = useRef<SVGGElement>(null);
  const p2Ref = useRef<SVGGElement>(null);

  const showEyes = screen === 'welcome' || screen === 'auth';
  const showShapes = screen === 'welcome';

  useEffect(() => {
    if (!showEyes) return;

    const handlePointerMove = (e: PointerEvent) => {
      const eyesEl = eyesRef.current;
      if (!eyesEl || !p1Ref.current || !p2Ref.current) return;
      const rect = eyesEl.getBoundingClientRect();
      if (!rect.width) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy) || 1;
      const maxOffset = (Math.min(dist, 140) / 140) * 10;
      const tx = ((dx / dist) * maxOffset).toFixed(1);
      const ty = ((dy / dist) * maxOffset).toFixed(1);

      p1Ref.current.style.transform = `translate(${tx}px, ${ty}px)`;
      p2Ref.current.style.transform = `translate(${tx}px, ${ty}px)`;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [showEyes]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Abstract geometric shapes on welcome */}
      {showShapes && (
        <>
          <div
            className="absolute rounded-full bg-[#b2ee05]"
            style={{ left: -30, top: -40, width: 240, height: 240 }}
          />
          <div
            className="absolute rounded-full bg-[#0a1038]"
            style={{ left: 190, top: 34, width: 64, height: 64 }}
          />
          <div
            className="absolute rounded-full bg-[#8b9dff]"
            style={{ right: -44, top: 46, width: 130, height: 130 }}
          />
          {/* Bottom dome */}
          <div
            className="absolute left-[-14px] right-[-14px] bottom-[-70px] h-[240px] bg-[#b2ee05]"
            style={{ borderRadius: '50% 50% 0 0 / 42% 42% 0 0' }}
          />
        </>
      )}

      {/* Interactive Mascot Eyes */}
      {showEyes && (
        <div
          ref={eyesRef}
          className="absolute left-1/2 -ml-[100px] w-[200px] h-[100px]"
          style={{
            bottom: screen === 'welcome' ? 46 : undefined,
            top: screen === 'auth' ? 24 : undefined,
          }}
        >
          <svg viewBox="0 0 200 100" width="200" height="100">
            {/* Eyebrows */}
            <path
              d="M26 14q16-12 32 0M142 14q16-12 32 0"
              fill="none"
              stroke="#0a1038"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Eye Whites */}
            <circle cx="58" cy="56" r="38" fill="#ffffff" />
            <circle cx="142" cy="56" r="38" fill="#ffffff" />

            {/* Left Pupil */}
            <g ref={p1Ref} className="transition-transform duration-75 ease-out">
              <circle cx="58" cy="56" r="20" fill="#0a1038" />
              <circle cx="51" cy="48" r="7" fill="#ffffff" />
            </g>

            {/* Right Pupil */}
            <g ref={p2Ref} className="transition-transform duration-75 ease-out">
              <circle cx="142" cy="56" r="20" fill="#0a1038" />
              <circle cx="135" cy="48" r="7" fill="#ffffff" />
            </g>

            {/* Nose dots */}
            <circle cx="94" cy="96" r="3" fill="#0a1038" />
            <circle cx="106" cy="96" r="3" fill="#0a1038" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default LimeDecor;
