'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { useToast } from '@/contexts/ToastContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [rollNo, setRollNo] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!rollNo) {
      setError('Roll number is required');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.forgotPassword({
        rollNo: rollNo.toUpperCase()
      });

      if (response.success) {
        setSuccess(response.message);
        setStep('reset');
      }
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to send OTP';
      if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: string }).message === 'string'
      ) {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
    }
    finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword({
        rollNo: rollNo.toUpperCase(),
        otp,
        newPassword
      });

      if (response.success) {
        toast.success('Password reset successful! Please login with your new password.');
        router.push('/login');
      }
    } 
    catch (err: unknown) {
      let errorMsg = 'Password reset failed';
      if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: string }).message === 'string'
      ) {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
    }
    finally {
      setLoading(false);
    }
  };

  if (step === 'reset') {
    return (
      <div className="min-h-screen bg-mesh-warm antialiased flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-linear-to-br from-coral-300/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md animate-scale-in">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔑</div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>Reset Password</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Enter the OTP sent to your email</p>
          </div>

          <div className="glass-strong rounded-3xl p-6 sm:p-8">
            {error && (
              <div className="mb-4 glass rounded-2xl p-3 bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 glass rounded-2xl p-3 bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400 text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>OTP Code</label>
                <input type="text" value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  className="input-romance w-full text-center text-2xl tracking-[0.5em] font-bold"
                  placeholder="000000" maxLength={6} required />
                <p className="text-xs mt-1 text-center" style={{ color: 'var(--muted)' }}>⏱ OTP expires in 15 minutes</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>New Password</label>
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    className="input-romance w-full pr-12" placeholder="Enter new password" required />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--muted)' }}>
                    {showNewPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    className="input-romance w-full pr-12" placeholder="Re-enter password" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--muted)' }}>
                    {showConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-romance w-full py-3 font-semibold">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Resetting…
                  </span>
                ) : 'Reset Password'}
              </button>
            </form>

            <button onClick={() => setStep('request')}
              className="btn-ghost w-full mt-3 py-2.5 text-sm">← Back</button>

            <div className="mt-5 pt-4 flex items-center justify-center gap-3 text-xs" style={{ borderTop: '1px solid var(--border-light)', color: 'var(--muted)' }}>
              <Link href="/terms" className="hover:underline">Terms</Link>
              <span>·</span>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <span>·</span>
              <Link href="/contact" className="hover:underline">Contact</Link>
              <span>·</span>
              <Link href="/encryption" className="hover:underline">Security</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-warm antialiased flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-linear-to-tr from-purple-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>Forgot Password</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Enter your roll number to receive an OTP</p>
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          {error && (
            <div className="mb-4 glass rounded-2xl p-3 bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Roll Number</label>
              <input type="text" value={rollNo}
                onChange={(e) => { setRollNo(e.target.value); setError(''); }}
                className="input-romance w-full uppercase" placeholder="B23417" required />
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>e.g. B24397, D22415, T25428</p>
            </div>

            <button type="submit" disabled={loading} className="btn-romance w-full py-3 font-semibold">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending OTP…
                </span>
              ) : 'Send OTP'}
            </button>
          </form>

          <Link href="/login" className="btn-ghost w-full mt-3 py-2.5 text-sm flex items-center justify-center gap-1">
            ← Back to Login
          </Link>

          <div className="mt-5 pt-4 flex items-center justify-center gap-3 text-xs" style={{ borderTop: '1px solid var(--border-light)', color: 'var(--muted)' }}>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link href="/contact" className="hover:underline">Contact</Link>
            <span>·</span>
            <Link href="/encryption" className="hover:underline">Security</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
