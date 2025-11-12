export const DarkVeilBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      
      {/* Animated veil layers - Optimized for mobile */}
      <div className="absolute inset-0">
        {/* Layer 1 - Large slow moving orb */}
        <div 
          className="absolute top-0 -left-48 w-96 h-96 rounded-full blur-3xl animate-float will-change-transform"
          style={{ 
            background: 'radial-gradient(circle, rgba(82, 39, 255, 0.4) 0%, rgba(82, 39, 255, 0) 70%)',
            animationDuration: '20s' 
          }}
        />
        
        {/* Layer 2 - Medium orb */}
        <div 
          className="absolute top-1/4 right-0 w-80 h-80 rounded-full blur-3xl animate-float-delayed will-change-transform"
          style={{ 
            background: 'radial-gradient(circle, rgba(255, 159, 252, 0.3) 0%, rgba(255, 159, 252, 0) 70%)',
            animationDuration: '25s', 
            animationDelay: '5s' 
          }}
        />
        
        {/* Layer 3 - Small orb - Hidden on mobile for performance */}
        <div 
          className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full blur-3xl animate-float will-change-transform hidden sm:block"
          style={{ 
            background: 'radial-gradient(circle, rgba(177, 158, 239, 0.35) 0%, rgba(177, 158, 239, 0) 70%)',
            animationDuration: '30s', 
            animationDelay: '10s' 
          }}
        />
        
        {/* Layer 4 - Bottom right accent */}
        <div 
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl animate-float-delayed will-change-transform"
          style={{ 
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.35) 0%, rgba(147, 51, 234, 0) 70%)',
            animationDuration: '22s' 
          }}
        />
        
        {/* Layer 5 - Center ambient glow - Reduced size on mobile */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] sm:w-[40rem] h-[30rem] sm:h-[40rem] rounded-full blur-3xl animate-pulse-slow will-change-transform"
          style={{ 
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0) 60%)'
          }}
        />

        {/* Additional purple glow top right - Hidden on mobile */}
        <div 
          className="absolute top-1/3 right-1/3 w-72 h-72 rounded-full blur-3xl animate-float will-change-transform hidden md:block"
          style={{ 
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0) 70%)',
            animationDuration: '28s',
            animationDelay: '3s'
          }}
        />
      </div>
      
      {/* Noise texture overlay for depth - Reduced opacity on mobile */}
      <div 
        className="absolute inset-0 opacity-[0.02] sm:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Subtle grid pattern - Hidden on mobile for better performance */}
      <div 
        className="absolute inset-0 opacity-[0.03] hidden sm:block"
        style={{
          backgroundImage: `
            linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};
