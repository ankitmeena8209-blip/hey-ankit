import React from 'react';

interface DecorProps {
  screen: 'welcome' | 'auth' | 'chat' | 'inbox';
}

export const KawaiiDecor: React.FC<DecorProps> = ({ screen }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Yellow Sparkles */}
      <div
        className="absolute rounded-[4px] bg-[#ffd84d] will-change-transform animate-[tw_2.6s_ease-in-out_infinite_alternate]"
        style={{
          width: 14,
          height: 14,
          left: 30,
          top: 70,
          boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.12)',
        }}
      />
      <div
        className="absolute rounded-[4px] bg-[#ffd84d] will-change-transform animate-[tw_2.6s_ease-in-out_infinite_alternate]"
        style={{
          width: 14,
          height: 14,
          right: 46,
          top: 150,
          animationDelay: '-1s',
          boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.12)',
        }}
      />
      <div
        className="absolute rounded-[4px] bg-[#ffd84d] will-change-transform animate-[tw_2.6s_ease-in-out_infinite_alternate]"
        style={{
          width: 10,
          height: 10,
          left: 60,
          top: 300,
          animationDelay: '-2s',
          boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.12)',
        }}
      />
      <div
        className="absolute rounded-[4px] bg-[#ffd84d] will-change-transform animate-[tw_2.6s_ease-in-out_infinite_alternate]"
        style={{
          width: 14,
          height: 14,
          right: 26,
          top: 360,
          animationDelay: '-0.5s',
          boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.12)',
        }}
      />

      {/* Welcome Screen Bold Kawaii Heart */}
      {screen === 'welcome' && (
        <svg
          className="absolute left-1/2 -ml-[62px] top-[120px] w-[124px] pointer-events-none"
          viewBox="0 0 100 90"
          style={{
            filter: 'drop-shadow(5px 5px 0 var(--hs, #3b2a34))',
          }}
        >
          <path
            d="M50 84C14 56 4 38 4 24 4 10 15 3 27 3c10 0 19 6 23 15C54 9 63 3 73 3c12 0 23 7 23 21 0 14-10 32-46 60z"
            fill="#f06aa6"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M22 20q4-8 12-8"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </div>
  );
};

export default KawaiiDecor;
