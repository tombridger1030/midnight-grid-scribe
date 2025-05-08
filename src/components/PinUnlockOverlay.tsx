import React, { useState, useEffect } from 'react';

interface PinUnlockOverlayProps {
  onUnlock: () => void;
}

const FIXED_PIN = '2508'; // Obfuscated or replace with your own PIN

export default function PinUnlockOverlay({ onUnlock }: PinUnlockOverlayProps) {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (input.length === 4) {
      if (input === FIXED_PIN) {
        sessionStorage.setItem('noctisium_unlocked', 'true');
        onUnlock();
      } else {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setInput('');
        }, 500);
      }
    }
  }, [input, onUnlock]);

  const handleButton = (val: string) => {
    if (val === 'back') {
      setInput((prev) => prev.slice(0, -1));
    } else if (val === 'clear') {
      setInput('');
    } else if (input.length < 4) {
      setInput((prev) => prev + val);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50">
      <div className={`flex flex-col items-center mb-8 ${shake ? 'animate-shake' : ''}`}>
        <div className="text-6xl text-green-400 mb-4">🔒</div>
        <div className="text-2xl text-green-300">Enter 4-digit Access PIN</div>
        <div className="flex space-x-2 mt-2">
          {Array.from({ length: input.length }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-green-400 rounded-full" />
          ))}
          {Array.from({ length: 4 - input.length }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-gray-700 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {['1','2','3','4','5','6','7','8','9'].map((num) => (
          <button
            key={num}
            onClick={() => handleButton(num)}
            className="w-16 h-16 bg-gray-800 text-green-400 text-2xl rounded"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleButton('back')}
          className="w-16 h-16 bg-gray-800 text-green-400 text-2xl rounded"
        >
          ⌫
        </button>
        <button
          onClick={() => handleButton('0')}
          className="w-16 h-16 bg-gray-800 text-green-400 text-2xl rounded"
        >
          0
        </button>
        <button
          onClick={() => handleButton('clear')}
          className="w-16 h-16 bg-gray-800 text-green-400 text-2xl rounded"
        >
          C
        </button>
      </div>
    </div>
  );
} 