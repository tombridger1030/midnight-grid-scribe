import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-[#8A8D93] font-mono p-4">
      <form onSubmit={handleSubmit} className="bg-[#1D1D1D] p-4 rounded w-full max-w-sm space-y-3">
        <h1 className="text-lg text-center mb-2">{isLogin ? 'Sign In' : 'Sign Up'}</h1>
        <input
          className="terminal-input w-full"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="terminal-input w-full"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-500 text-xs">{error}</div>}
        <button type="submit" className="terminal-button w-full min-h-[44px]">
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
        <button
          type="button"
          className="terminal-button w-full mt-2 min-h-[44px]"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Need an account?' : 'Have an account?'}
        </button>
      </form>
    </div>
  );
};

export default AuthPage;
