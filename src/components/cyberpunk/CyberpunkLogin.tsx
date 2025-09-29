import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MatrixBackground from './MatrixBackground';
import GlitchText from './GlitchText';
import TerminalBootSequence from './TerminalBootSequence';
import HackerAnimation from './HackerAnimation';
import CodeRainEffect from './CodeRainEffect';
import TerminalFlicker from './TerminalFlicker';
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';

interface CyberpunkLoginProps {
  onSuccess?: () => void;
}

const CyberpunkLogin: React.FC<CyberpunkLoginProps> = ({ onSuccess }) => {
  const { signIn, signUp } = useAuth();
  const [showBoot, setShowBoot] = useState(true);
  const [showHackerAnimation, setShowHackerAnimation] = useState(false);
  const [authenticatedUsername, setAuthenticatedUsername] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [glitchTrigger, setGlitchTrigger] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');

  useEffect(() => {
    if (!showBoot) {
      // Initialize terminal
      const lines = [
        'SECURE CONNECTION ESTABLISHED',
        'BIOMETRIC AUTHENTICATION REQUIRED',
        'QUANTUM ENCRYPTION: ACTIVE',
        ''
      ];
      setTerminalLines(lines);
      setCurrentPrompt(mode === 'signin' ? 'user@noctisium:~$ authenticate' : 'user@noctisium:~$ register');
    }
  }, [showBoot, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Add typing sound effect
    if (typeof window !== 'undefined' && (window as any).cyberpunkSounds) {
      (window as any).cyberpunkSounds.playTyping();
    }

    setTerminalLines(prev => [
      ...prev,
      `> ${mode === 'signup' ? 'Registering new user...' : 'Authenticating credentials...'}`,
      '> Establishing secure connection...'
    ]);

    try {
      let result;

      if (mode === 'signup') {
        // Validation
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        if (!formData.username.trim()) {
          throw new Error('Username is required');
        }
        if (formData.username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
          throw new Error('Username can only contain letters, numbers, _ and -');
        }

        result = await signUp(
          formData.email,
          formData.password,
          formData.username.trim(),
          formData.displayName.trim() || formData.username.trim()
        );
      } else {
        if (!formData.email || !formData.password) {
          throw new Error('Email and password are required');
        }

        result = await signIn(formData.email, formData.password);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Success - trigger hacker animation
      setTerminalLines(prev => [
        ...prev,
        `> ${mode === 'signup' ? 'User registered successfully' : 'Authentication successful'}`,
        '> ACCESS GRANTED',
        '> Initializing neural interface...'
      ]);

      // Store username for hacker animation
      setAuthenticatedUsername(formData.username || formData.email.split('@')[0]);

      setTimeout(() => {
        setShowHackerAnimation(true);
      }, 800);

    } catch (err: any) {
      const errorMessage = err.message || 'Authentication failed';
      setError(errorMessage);
      setGlitchTrigger(true);
      setTimeout(() => setGlitchTrigger(false), 300);

      // Play error sound
      if (typeof window !== 'undefined' && (window as any).cyberpunkSounds) {
        (window as any).cyberpunkSounds.playError();
      }

      setTerminalLines(prev => [
        ...prev,
        `> ERROR: ${errorMessage}`,
        '> ACCESS DENIED',
        '> Connection terminated',
        ''
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'signin' ? 'signup' : 'signin');
    setFormData({
      email: '',
      password: '',
      username: '',
      displayName: '',
      confirmPassword: ''
    });
    setError('');
  };

  const inputClasses = `
    w-full bg-transparent border-b border-[#5FE3B3]/50
    text-[#5FE3B3] placeholder-[#5FE3B3]/30
    focus:border-[#5FE3B3] focus:outline-none
    font-mono text-sm py-2 px-1
    transition-all duration-300
  `;

  if (showBoot) {
    return (
      <>
        <MatrixBackground opacity={0.05} />
        <TerminalBootSequence onComplete={() => setShowBoot(false)} />
      </>
    );
  }

  if (showHackerAnimation) {
    return (
      <HackerAnimation
        username={authenticatedUsername}
        onComplete={() => onSuccess?.()}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <MatrixBackground opacity={0.08} />
      <CodeRainEffect active={loading || !!error} intensity="medium" />

      <TerminalFlicker enabled={true} flickerIntensity="low">
        <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Terminal Window */}
        <div className="border border-[#5FE3B3]/50 bg-black/90 backdrop-blur-sm">
          {/* Terminal Header */}
          <div className="border-b border-[#5FE3B3]/30 p-3 flex items-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#FF6B6B]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FFD700]"></div>
              <div className="w-3 h-3 rounded-full bg-[#5FE3B3]"></div>
            </div>
            <div className="ml-4 text-[#5FE3B3] text-sm font-mono">
              NOCTISIUM SECURE TERMINAL
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-6 font-mono">
            {/* Terminal Output */}
            <div className="mb-6 space-y-1 text-sm">
              {terminalLines.map((line, index) => (
                <div key={index} className="text-[#8A8D93]">
                  {line}
                </div>
              ))}
              <div className="text-[#5FE3B3]">
                {currentPrompt}<span className="animate-pulse">_</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="text-[#5FE3B3]/70 text-xs mb-1 font-mono">EMAIL ADDRESS</div>
                  <input
                    type="email"
                    placeholder="user@noctisium.network"
                    className={inputClasses}
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                {mode === 'signup' && (
                  <>
                    <div>
                      <div className="text-[#5FE3B3]/70 text-xs mb-1 font-mono">USERNAME</div>
                      <input
                        type="text"
                        placeholder="midnight"
                        className={inputClasses}
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <div className="text-[#5FE3B3]/70 text-xs mb-1 font-mono">DISPLAY NAME (optional)</div>
                      <input
                        type="text"
                        placeholder="Midnight Operator"
                        className={inputClasses}
                        value={formData.displayName}
                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                <div>
                  <div className="text-[#5FE3B3]/70 text-xs mb-1 font-mono">PASSWORD</div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      className={inputClasses}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-[#5FE3B3]/50 hover:text-[#5FE3B3]"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <div className="text-[#5FE3B3]/70 text-xs mb-1 font-mono">CONFIRM PASSWORD</div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      className={inputClasses}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-[#FF6B6B] text-sm">
                  <AlertTriangle size={16} />
                  <GlitchText text={error} triggerGlitch={glitchTrigger} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full p-3 border border-[#5FE3B3] text-[#5FE3B3]
                    hover:bg-[#5FE3B3] hover:text-black transition-all duration-300
                    font-mono text-sm uppercase tracking-wide
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center space-x-2
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>PROCESSING...</span>
                    </>
                  ) : (
                    <span>{mode === 'signin' ? 'ACCESS NETWORK' : 'JOIN NETWORK'}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-[#5FE3B3]/70 hover:text-[#5FE3B3] transition-colors text-sm font-mono"
                >
                  {mode === 'signin'
                    ? '> New user? Register for network access'
                    : '> Already have access? Sign in'
                  }
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-[#5FE3B3]/20 text-center">
              <div className="text-[#5FE3B3]/50 text-xs font-mono">
                NOCTISIUM NETWORK v3.7.2 | QUANTUM ENCRYPTED
              </div>
            </div>
          </div>
        </div>
        </div>
      </TerminalFlicker>
    </div>
  );
};

export default CyberpunkLogin;