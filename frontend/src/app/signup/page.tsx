'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { DEGREE_TYPE_OPTIONS, DegreeType } from '@/types/auth.types';
import { useTheme } from '@/contexts/ThemeContext';

export default function SignupPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState<'signup' | 'verify'>('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullRollNo, setFullRollNo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    degreeType: '' as DegreeType,
    rollNumber: '',
    name: '',
    gender: '' as 'male' | 'female' | 'other',
    branch: '',
    password: '',
    confirmPassword: ''
  });

  const [otp, setOtp] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.degreeType || !formData.rollNumber || !formData.name || 
        !formData.gender || !formData.branch || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (!/^\d{1,5}$/.test(formData.rollNumber)) {
      setError('Roll number must be 1-5 digits');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.signup({
        degreeType: formData.degreeType,
        rollNumber: formData.rollNumber,
        name: formData.name,
        gender: formData.gender,
        branch: formData.branch,
        password: formData.password
      });

      if (response.success && response.data?.rollNo) {
        setFullRollNo(response.data.rollNo);
        setStep('verify');
      }
    } 
    catch (err: unknown) {
      let errorMsg = 'SignUp failed';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
    }
    finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.verifyOTP({
        rollNo: fullRollNo,
        otp,
        purpose: 'signup'
      });

      if (response.success) {
        // Redirect to dashboard or home
        router.push('/dashboard');
      }
    } 
    catch (err: unknown) {
      let errorMsg = 'OTP verification failed';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
    }
    finally {
      setLoading(false);
    }
  };

  const ThemeToggle = () => (
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
  );

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-mesh-warm antialiased flex items-center justify-center px-5 py-10">
        <ThemeToggle />
        <div className="w-full max-w-md animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#84CC16,#22C55E)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--heading)' }}>Check your inbox ✉️</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>OTP sent to</p>
            <p className="font-bold text-sm mt-0.5" style={{ color: 'var(--pink)' }}>{fullRollNo}@students.iitmandi.ac.in</p>
          </div>

          <div className="glass-strong rounded-3xl p-8">
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-3 text-center" style={{ color: 'var(--heading)' }}>Enter 6-digit OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  className="input-romance text-center text-3xl tracking-[0.5em] font-bold"
                  placeholder="······"
                  maxLength={6}
                  required
                />
                <p className="text-xs mt-2 text-center flex items-center justify-center gap-1" style={{ color: 'var(--muted)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Expires in 15 minutes
                </p>
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="btn-romance w-full py-3.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Verifying...</> : 'Verify & Complete Signup ✓'}
              </button>
            </form>
            <div className="mt-5 text-center">
              <button onClick={() => setStep('signup')} className="text-sm font-semibold inline-flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: 'var(--pink)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to signup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-warm antialiased flex items-center justify-center px-5 py-10 relative">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-96 h-96 bg-linear-to-br from-pink-300/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-linear-to-br from-purple-300/15 to-transparent rounded-full blur-3xl" />
      </div>
      <ThemeToggle />
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--grad-romance)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>Byte<span className="text-gradient-romance">Chat</span></span>
          </div>
          <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--heading)' }}>Join the campus 🎓</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Create your IIT Mandi account</p>
        </div>

        <div className="glass-strong rounded-3xl p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Degree *</label>
                <select name="degreeType" value={formData.degreeType} onChange={handleChange} className="select-romance" required>
                  <option value="">Select</option>
                  {DEGREE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Roll No (5 digits) *</label>
                <input type="text" name="rollNumber" value={formData.rollNumber} onChange={handleChange} className="input-romance font-mono" placeholder="23428" maxLength={5} required />
                {formData.degreeType && formData.rollNumber && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--pink)' }}>{formData.degreeType}{formData.rollNumber.padStart(5, '0')}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-romance" placeholder="Thacker Vyom" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Gender *</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="select-romance" required>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Branch *</label>
                <input type="text" name="branch" value={formData.branch} onChange={handleChange} className="input-romance" placeholder="M&C, Mechanical" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="input-romance pr-11" placeholder="Choose a password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /> : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Confirm Password *</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-romance pr-11" placeholder="Re-enter password" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showConfirmPassword ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /> : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-romance w-full py-3.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Creating Account...</> : 'Create Account →'}
            </button>
          </form>

          <div className="mt-5 space-y-4">
            <p className="text-center text-sm" style={{ color: 'var(--body)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold hover:opacity-80" style={{ color: 'var(--pink)' }}>Sign in</Link>
            </p>
            <div className="pt-4 border-t text-center" style={{ borderColor: 'var(--border-light)' }}>
              <Link href="/impress-us" className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: 'var(--purple)' }}>
                ✨ Not a student? Impress us
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
