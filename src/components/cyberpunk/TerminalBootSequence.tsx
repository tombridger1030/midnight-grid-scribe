import React, { useState, useEffect } from 'react';
import TypewriterText from '@/components/TypewriterText';

interface BootMessage {
  text: string;
  delay: number;
  color?: string;
}

interface TerminalBootSequenceProps {
  onComplete?: () => void;
  fastBoot?: boolean;
}

const TerminalBootSequence: React.FC<TerminalBootSequenceProps> = ({
  onComplete,
  fastBoot = false
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [bootComplete, setBootComplete] = useState(false);

  const bootMessages: BootMessage[] = [
    { text: 'NOCTISIUM TERMINAL v3.7.2', delay: fastBoot ? 200 : 800, color: '#5FE3B3' },
    { text: 'Initializing secure connection...', delay: fastBoot ? 100 : 600 },
    { text: 'Loading neural network protocols...', delay: fastBoot ? 100 : 500 },
    { text: 'Establishing quantum encryption tunnel...', delay: fastBoot ? 100 : 700 },
    { text: 'Syncing with distributed nodes...', delay: fastBoot ? 100 : 400 },
    { text: 'Calibrating biometric sensors...', delay: fastBoot ? 100 : 600 },
    { text: 'Loading user interface matrix...', delay: fastBoot ? 100 : 500 },
    { text: 'System initialization complete.', delay: fastBoot ? 200 : 800, color: '#5FE3B3' },
    { text: '', delay: fastBoot ? 100 : 300 },
    { text: 'Welcome to the NOCTISIUM network.', delay: fastBoot ? 300 : 1000, color: '#4eb4ff' },
  ];

  useEffect(() => {
    if (currentMessageIndex < bootMessages.length) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex(prev => prev + 1);
      }, bootMessages[currentMessageIndex]?.delay || 500);

      return () => clearTimeout(timer);
    } else if (!bootComplete) {
      setBootComplete(true);
      setTimeout(() => {
        onComplete?.();
      }, fastBoot ? 500 : 1500);
    }
  }, [currentMessageIndex, bootMessages.length, bootComplete, onComplete, fastBoot]);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#8A8D93] font-mono p-8">
      <div className="w-full max-w-2xl">
        {/* ASCII Art Logo */}
        <pre className="text-[#5FE3B3] mb-8 text-xs sm:text-sm leading-tight">
{`
    ███╗   ██╗ ██████╗  ██████╗████████╗██╗███████╗██╗██╗   ██╗███╗   ███╗
    ████╗  ██║██╔═══██╗██╔════╝╚══██╔══╝██║██╔════╝██║██║   ██║████╗ ████║
    ██╔██╗ ██║██║   ██║██║        ██║   ██║███████╗██║██║   ██║██╔████╔██║
    ██║╚██╗██║██║   ██║██║        ██║   ██║╚════██║██║██║   ██║██║╚██╔╝██║
    ██║ ╚████║╚██████╔╝╚██████╗   ██║   ██║███████║██║╚██████╔╝██║ ╚═╝ ██║
    ╚═╝  ╚═══╝ ╚═════╝  ╚═════╝   ╚═╝   ╚═╝╚══════╝╚═╝ ╚═════╝ ╚═╝     ╚═╝
`}
        </pre>

        {/* Boot Messages */}
        <div className="space-y-2 mb-8">
          {bootMessages.slice(0, currentMessageIndex).map((message, index) => (
            <div key={index} className="flex items-center">
              <span className="text-[#5FE3B3] mr-2">►</span>
              <span
                className="text-sm"
                style={{ color: message.color || '#8A8D93' }}
              >
                {message.text || '\u00A0'}
              </span>
              {index === currentMessageIndex - 1 && showCursor && (
                <span className="ml-1 text-[#5FE3B3]">_</span>
              )}
            </div>
          ))}
        </div>

        {bootComplete && (
          <div className="border border-[#5FE3B3] p-4 bg-[#5FE3B3]/5">
            <TypewriterText
              text="Enter your credentials to access the neural network."
              className="text-[#4eb4ff] text-sm text-center"
              speed={fastBoot ? 20 : 50}
            />
          </div>
        )}

        {/* Progress indicator */}
        {currentMessageIndex < bootMessages.length && (
          <div className="mt-8">
            <div className="flex justify-between text-xs text-[#5FE3B3] mb-2">
              <span>Loading...</span>
              <span>{Math.round((currentMessageIndex / bootMessages.length) * 100)}%</span>
            </div>
            <div className="w-full bg-[#1D1D1D] h-1">
              <div
                className="bg-[#5FE3B3] h-1 transition-all duration-300"
                style={{ width: `${(currentMessageIndex / bootMessages.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalBootSequence;