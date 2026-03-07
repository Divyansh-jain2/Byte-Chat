'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { useTheme } from '@/contexts/ThemeContext';
import { decryptPrivateKey } from '@/utils/e2ee.utils';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    rollNo: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.rollNo || !formData.password) {
      setError('All fields are required');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login({
        rollNo: formData.rollNo.toUpperCase(),
        password: formData.password
      });

      if (response.success && response.data?.user) {
        // E2EE: Decrypt and store private key
        const user = response.data.user;
        if (user.encryptedPrivateKey) {
          try {
            const privateKey = await decryptPrivateKey(user.encryptedPrivateKey, formData.password);
            sessionStorage.setItem('decryptedPrivateKey', privateKey);
          } catch (decryptErr) {
            console.error('[E2EE] Failed to decrypt private key:', decryptErr);
            // We don't block login if E2EE decryption fails here, but could show a warning later
          }
        }
        router.push('/dashboard');
      }
    }
    // catch (err: any) {
    //   setError(err.message || 'Login failed');
    // } 
    catch (err: unknown) {
      let errorMsg = 'Login failed';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
      // toast.error(errorMsg);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-warm antialiased flex items-center justify-center px-5 py-10 relative">

      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-96 h-96 bg-linear-to-br from-pink-300/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-linear-to-br from-purple-300/15 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Theme Toggle */}
      {mounted && (
        <button
          onClick={toggleTheme}
          className="fixed top-5 right-5 w-11 h-11 rounded-2xl glass flex items-center justify-center transition-all duration-200 hover:scale-105 z-50"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--body)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      )}

      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--grad-romance)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
              Byte<span className="text-gradient-romance">Chat</span>
            </span>
          </div>
          <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--heading)' }}>Welcome back! 👋</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Sign in to your IIT Mandi account</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-medium border" style={{ background: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' }}>
                {error}
              </div>
            )}

            {/* Roll Number */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>
                Roll Number
              </label>
              <div className="relative">
                <div className="login-icon-left">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleChange}
                  className="login-input-with-icon uppercase font-mono tracking-wide"
                  placeholder="B23397"
                  required
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>Format: B23397, D22417, T24428</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>
                Password
              </label>
              <div className="relative">
                <div className="login-icon-left">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="login-input-with-icon login-input-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-icon-right"
                  style={{ color: 'var(--muted)' }}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-pink-500" />
                <span className="text-sm" style={{ color: 'var(--body)' }}>Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--pink)' }}>
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-romance w-full py-3.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in →'}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 space-y-4">
            <p className="text-center text-sm" style={{ color: 'var(--body)' }}>
              No account?{' '}
              <Link href="/signup" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--pink)' }}>
                Create one free
              </Link>
            </p>

            <div className="pt-4 border-t text-center" style={{ borderColor: 'var(--border-light)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Not a student?</p>
              <Link href="/impress-us" className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: 'var(--purple)' }}>
                ✨ Impress us and join ByteChat
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
              <Link href="/terms" className="hover:text-pink-500 transition-colors">Terms</Link>
              <span>·</span>
              <Link href="/privacy" className="hover:text-pink-500 transition-colors">Privacy</Link>
              <span>·</span>
              <Link href="/contact" className="hover:text-pink-500 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

