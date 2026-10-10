import React from 'react';

interface DecorProps {
  screen: 'welcome' | 'auth' | 'chat' | 'inbox';
}

export const SapphireDecor: React.FC<DecorProps> = ({ screen }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Soft Blobs */}
      <div
        className="absolute rounded-full bg-white blur-3xl opacity-60 pointer-events-none"
        style={{
          width: 280,
          height: 280,
          left: -90,
          top: -70,
        }}
      />
      <div
        className="absolute rounded-full bg-white blur-3xl opacity-60 pointer-events-none"
        style={{
          width: 240,
          height: 240,
          right: -90,
          bottom: 100,
        }}
      />

      {/* Welcome Screen Cobalt Hero Card with concentric ring pattern */}
      {screen === 'welcome' && (
        <div
          className="absolute left-3.5 right-3.5 top-3.5 h-[276px] rounded-[28px] overflow-hidden shadow-2xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 78% 34%, transparent 0 38px, rgba(255, 255, 255, 0.2) 39px 40px, transparent 41px 78px, rgba(255, 255, 255, 0.18) 79px 80px, transparent 81px 118px, rgba(255, 255, 255, 0.14) 119px 120px, transparent 121px), linear-gradient(135deg, #1a6fbd, #4aaaf0)',
            boxShadow: '0 18px 36px rgba(31, 80, 150, 0.3)',
          }}
        >
          {/* Top-left accent badge */}
          <div
            className="absolute left-[22px] top-[22px] w-[46px] h-[34px] rounded-[12px_12px_12px_3px] bg-white opacity-95 shadow-sm"
          />
        </div>
      )}
    </div>
  );
};

export default SapphireDecor;
