'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ImpressUsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('contact@bytechat.in');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-mesh-warm antialiased flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-linear-to-tr from-purple-300/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-linear-to-br from-orange-300/8 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/"
            className="inline-block text-2xl font-black tracking-tight mb-4"
            style={{ background: 'var(--grad-romance)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BYTE-CHAT
          </Link>
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📬</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Impress Us!</h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
              Not a current IIT Mandi student? We&#39;d love to hear why you should be part of BYTE-CHAT.
            </p>
          </div>

          {/* Email box */}
          <div className="glass rounded-2xl p-4 mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Send your application to</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-mono font-semibold" style={{ color: 'var(--heading)' }}>
                contact@bytechat.in
              </span>
              <button onClick={handleCopyEmail} className="btn-ghost px-3 py-1.5 text-xs shrink-0">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Please include */}
          <div className="glass rounded-2xl p-4 mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Please include</p>
            <ul className="space-y-2">
              {[
                'Your full name',
                'Email address or phone number',
                'Your connection to IIT Mandi',
                'Why you want to join BYTE-CHAT',
                'ID proof or relevant attachment',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                  <span className="mt-0.5 shrink-0" style={{ color: 'var(--pink)' }}>✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Response time */}
          <div className="glass rounded-2xl p-3 mb-5 text-center">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              ⏱ We typically respond within{' '}
              <span className="font-semibold" style={{ color: 'var(--heading)' }}>1-2 business days</span>
            </p>
          </div>

          {/* CTA */}
          <button onClick={handleCopyEmail} className="btn-romance w-full py-3 font-semibold mb-3">
            {copied ? '✓ Email Copied!' : '📋 Copy Email Address'}
          </button>

          <Link href="/login" className="btn-ghost w-full py-2.5 text-sm flex items-center justify-center gap-1">
            ← Back to Login
          </Link>

          {/* Footer links */}
          <div className="mt-5 pt-4 flex items-center justify-center gap-3 text-xs"
            style={{ borderTop: '1px solid var(--border-light)', color: 'var(--muted)' }}>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
