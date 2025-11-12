import { DarkVeilBackground } from "./DarkVeilBackground";
import Silk from "./SilkBackground";
import { Suspense } from "react";

export const EnhancedBackground = () => {
  // Detect mobile via media query at runtime
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base Layer - Dark Veil with gradient orbs */}
      <DarkVeilBackground />
      
      {/* Silk Shader Layer - Enabled on all devices with optimized settings */}
      <Suspense fallback={null}>
        <div className="absolute inset-0 opacity-35 mix-blend-soft-light">
          <Silk 
            speed={isMobile ? 1.5 : 1.8}
            scale={isMobile ? 1.6 : 1.8}
            color="#3B82F6"
            noiseIntensity={isMobile ? 1.0 : 1}
            rotation={0.15}
          />
        </div>
      </Suspense>
      
      {/* Overlay for depth and color grading */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/10 via-transparent to-purple-950/10" />
    </div>
  );
};
