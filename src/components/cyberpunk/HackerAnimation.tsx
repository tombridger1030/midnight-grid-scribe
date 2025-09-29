import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';
import ParticleField from './ParticleField';
import CodeRainEffect from './CodeRainEffect';
import { playSound } from './SoundEffects';

interface HackerAnimationProps {
  onComplete?: () => void;
  username?: string;
}

const HackerAnimation: React.FC<HackerAnimationProps> = ({ onComplete, username = 'USER' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);

  const hackerSteps = [
    { text: 'INITIALIZING NEURAL HANDSHAKE...', delay: 800, color: '#5FE3B3' },
    { text: 'SCANNING BIOMETRIC SIGNATURE...', delay: 1200, color: '#4eb4ff' },
    { text: 'BYPASSING FIREWALL PROTOCOLS...', delay: 900, color: '#FFD700' },
    { text: 'QUANTUM ENCRYPTION ACTIVATED...', delay: 1000, color: '#FF6B00' },
    { text: 'NEURAL LINK ESTABLISHED...', delay: 800, color: '#5FE3B3' },
    { text: `WELCOME TO THE GRID, ${username.toUpperCase()}...`, delay: 1500, color: '#4eb4ff' }
  ];

  useEffect(() => {
    if (currentStep < hackerSteps.length) {
      const timer = setTimeout(() => {
        // Play sound effect for each step
        playSound('beep');
        setCurrentStep(prev => prev + 1);
      }, hackerSteps[currentStep]?.delay || 1000);

      return () => clearTimeout(timer);
    } else {
      // Start progress bar after all steps
      setShowProgress(true);
      playSound('scanning');

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            playSound('success');
            setTimeout(() => onComplete?.(), 800);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => clearInterval(progressInterval);
    }
  }, [currentStep, onComplete, username]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 font-mono">
      {/* Background effects */}
      <CodeRainEffect active={true} intensity="high" />
      <ParticleField active={showProgress} particleCount={30} color="#5FE3B3" speed={2} />

      <div className="w-full max-w-2xl px-8">
        {/* Scanning effect overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-[#5FE3B3] to-transparent"
            style={{
              top: '50%',
              boxShadow: '0 0 20px #5FE3B3, 0 0 40px #5FE3B3',
              animation: 'scanLine 3s ease-in-out infinite'
            }}
          />
        </div>

        {/* Main content */}
        <div className="relative z-10 border border-[#5FE3B3]/50 bg-black/90 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-[#5FE3B3] text-lg mb-2">NOCTISIUM NEURAL INTERFACE</div>
            <div className="text-[#8A8D93] text-sm">ESTABLISHING SECURE CONNECTION</div>
          </div>

          {/* Hacker steps */}
          <div className="space-y-3 mb-8 min-h-[200px]">
            {hackerSteps.slice(0, currentStep).map((step, index) => (
              <div key={index} className="flex items-center text-sm">
                <span className="text-[#5FE3B3] mr-2">►</span>
                <span style={{ color: step.color }}>
                  {step.text}
                </span>
                {index === currentStep - 1 && (
                  <span className="ml-2 text-[#5FE3B3] animate-pulse">█</span>
                )}
              </div>
            ))}

            {/* Add some fake system info during animation */}
            {currentStep >= 2 && (
              <div className="mt-6 p-3 border border-[#333] bg-[#0F0F0F] text-xs space-y-1">
                <div className="text-[#8A8D93]">SYSTEM INFO:</div>
                <div className="text-[#FFD700]">• IP: 192.168.1.{Math.floor(Math.random() * 255)}</div>
                <div className="text-[#FFD700]">• PORT: {8000 + Math.floor(Math.random() * 1000)}</div>
                <div className="text-[#FFD700]">• PROTOCOL: HTTPS/2.0</div>
                <div className="text-[#FFD700]">• ENCRYPTION: AES-256</div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {showProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#5FE3B3]">
                <span>Neural sync progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-[#1D1D1D] h-2 border border-[#333]">
                <div
                  className="h-full bg-gradient-to-r from-[#5FE3B3] to-[#4eb4ff] transition-all duration-100"
                  style={{
                    width: `${progress}%`,
                    boxShadow: progress > 0 ? '0 0 10px rgba(95, 227, 179, 0.5)' : 'none'
                  }}
                />
              </div>
              <div className="text-center text-xs text-[#8A8D93]">
                Synchronizing neural pathways...
              </div>
            </div>
          )}

          {/* Matrix-style data stream */}
          {currentStep >= 3 && (
            <div className="absolute right-4 top-4 text-xs text-[#5FE3B3]/30 font-mono">
              <div className="animate-pulse">01001110 01001111</div>
              <div className="animate-pulse" style={{ animationDelay: '0.5s' }}>01000011 01010100</div>
              <div className="animate-pulse" style={{ animationDelay: '1s' }}>01001001 01010011</div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default HackerAnimation;