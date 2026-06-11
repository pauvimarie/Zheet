import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, BookOpen } from 'lucide-react';

type Mode = 'login' | 'signup' | 'reset';

const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else if (mode === 'signup') await signUp(email, password);
      else {
        await resetPassword(email);
        setMessage('Password reset email sent.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 paper-texture"
      style={{ backgroundColor: 'var(--paper-bg)' }}>
      
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-full border"
        style={{ borderColor: 'var(--paper-line)', color: 'var(--ink-secondary)' }}
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <BookOpen size={28} style={{ color: 'var(--accent-blue)' }} />
            <h1 className="text-4xl font-bold handwritten" style={{ color: 'var(--ink)' }}>
              Zheet
            </h1>
          </div>
          <p className="text-sm worksheet-font" style={{ color: 'var(--ink-secondary)' }}>
            Digital worksheet companion
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-8 shadow-lg border"
          style={{
            backgroundColor: theme === 'light' ? '#fff' : '#16213e',
            borderColor: 'var(--paper-line)',
          }}>
          
          <h2 className="handwritten text-2xl mb-6" style={{ color: 'var(--ink)' }}>
            {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5 font-medium"
                style={{ color: 'var(--ink-secondary)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--paper-bg)',
                  borderColor: 'var(--paper-line)',
                  color: 'var(--ink)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--paper-line)'}
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs mb-1.5 font-medium"
                  style={{ color: 'var(--ink-secondary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--paper-bg)',
                    borderColor: 'var(--paper-line)',
                    color: 'var(--ink)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--paper-line)'}
                />
              </div>
            )}

            {error && (
              <p className="text-xs py-2 px-3 rounded-lg"
                style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                {error}
              </p>
            )}
            {message && (
              <p className="text-xs py-2 px-3 rounded-lg"
                style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity"
              style={{ backgroundColor: 'var(--ink)', color: 'var(--paper-bg)', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-5 text-center text-xs space-y-2" style={{ color: 'var(--ink-secondary)' }}>
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('reset')}
                  className="underline block w-full">Forgot password?</button>
                <button onClick={() => setMode('signup')}
                  className="underline block w-full">New here? Create account</button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => setMode('login')} className="underline">
                Already have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => setMode('login')} className="underline">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
