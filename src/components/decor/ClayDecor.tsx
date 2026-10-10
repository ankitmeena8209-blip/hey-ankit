import React from 'react';

interface DecorProps {
  screen: 'welcome' | 'auth' | 'chat' | 'inbox';
}

export const ClayDecor: React.FC<DecorProps> = ({ screen }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Puffy Clay Clouds */}
      <div
        className="absolute rounded-[40px] bg-[#fbf7f2] will-change-transform animate-[bob_8s_ease-in-out_infinite_alternate]"
        style={{
          left: 14,
          top: 34,
          width: 84,
          height: 32,
          boxShadow: '0 8px 0 rgba(120, 95, 175, 0.12), inset 0 4px 6px #fff',
        }}
      />
      <div
        className="absolute rounded-[40px] bg-[#fbf7f2] will-change-transform animate-[bob_8s_ease-in-out_infinite_alternate]"
        style={{
          right: 16,
          top: 106,
          width: 64,
          height: 26,
          animationDelay: '-3s',
          boxShadow: '0 8px 0 rgba(120, 95, 175, 0.12), inset 0 4px 6px #fff',
        }}
      />

      {/* Welcome Screen Clay Plant & Flower */}
      {screen === 'welcome' && (
        <>
          {/* Potted Plant */}
          <svg
            className="absolute left-[10px] bottom-[26px] w-[70px] pointer-events-none"
            viewBox="0 0 80 110"
          >
            <ellipse cx="40" cy="36" rx="12" ry="26" fill="#86ad63" />
            <ellipse
              cx="22"
              cy="48"
              rx="10"
              ry="22"
              fill="#7aa056"
              transform="rotate(-28 22 48)"
            />
            <ellipse
              cx="58"
              cy="48"
              rx="10"
              ry="22"
              fill="#7aa056"
              transform="rotate(28 58 48)"
            />
            <path d="M16 74h48l-6 32H22z" fill="#e5c39a" />
          </svg>

          {/* Clay Flower */}
          <svg
            className="absolute right-[12px] bottom-[26px] w-[66px] pointer-events-none"
            viewBox="0 0 70 110"
          >
            <path d="M35 60v26" stroke="#6f9a52" strokeWidth="5" strokeLinecap="round" />
            <g fill="#f7b6c4">
              <circle cx="35" cy="26" r="13" />
              <circle cx="52" cy="38" r="13" />
              <circle cx="46" cy="56" r="13" />
              <circle cx="24" cy="56" r="13" />
              <circle cx="18" cy="38" r="13" />
            </g>
            <circle cx="35" cy="42" r="10" fill="#ffd45a" />
            <path d="M14 84h42l-5 22H19z" fill="#f3a7b5" />
          </svg>
        </>
      )}
    </div>
  );
};

export default ClayDecor;
