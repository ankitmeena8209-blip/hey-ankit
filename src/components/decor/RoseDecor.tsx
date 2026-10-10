import React from 'react';

interface DecorProps {
  screen: 'welcome' | 'auth' | 'chat' | 'inbox';
}

export const RoseDecor: React.FC<DecorProps> = ({ screen }) => {
  const isChatOrInbox = screen === 'chat' || screen === 'inbox';

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-500 ${
        isChatOrInbox ? 'opacity-40' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      {/* Glossy sphere 1 */}
      <div
        className="absolute rounded-full pointer-events-none will-change-transform animate-[bob_9s_ease-in-out_infinite_alternate]"
        style={{
          width: 230,
          height: 230,
          right: -70,
          top: 140,
          background:
            'radial-gradient(circle at 32% 28%, #fff2f4 0, #f8b8c6 28%, #ee8fa5 62%, #e57b95 100%)',
          boxShadow:
            'inset -10px -14px 30px rgba(190, 70, 100, 0.35), 0 30px 60px rgba(160, 50, 80, 0.25)',
        }}
      />

      {/* Glossy sphere 2 */}
      <div
        className="absolute rounded-full pointer-events-none will-change-transform animate-[bob_9s_ease-in-out_infinite_alternate]"
        style={{
          width: 120,
          height: 120,
          left: -34,
          top: 330,
          opacity: 0.85,
          animationDelay: '-4s',
          background:
            'radial-gradient(circle at 32% 28%, #fff2f4 0, #f8b8c6 28%, #ee8fa5 62%, #e57b95 100%)',
          boxShadow:
            'inset -10px -14px 30px rgba(190, 70, 100, 0.35), 0 30px 60px rgba(160, 50, 80, 0.25)',
        }}
      />
    </div>
  );
};

export default RoseDecor;
