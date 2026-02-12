'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

export default function ImpressUsPage() {
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('oppenheimer.6thaug@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 dark:from-purple-950 dark:via-pink-950 dark:to-red-950 flex items-center justify-center p-4 transition-colors duration-300">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-3 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group z-50"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <svg className="w-6 h-6 text-white group-hover:rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-yellow-300 group-hover:rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>

      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <h1 className="text-5xl font-bold text-white mb-2 tracking-wider drop-shadow-lg">
              BYTE-CHAT
            </h1>
          </Link>
          <p className="text-white/90 text-lg">IIT Mandi Student Community</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-gray-700/50">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 p-8 text-white">
            <h2 className="text-3xl font-bold mb-2">✨ Impress Us!</h2>
            <p className="text-white/90">
              Not a current student? We'd love to hear why you should be part of BYTE-CHAT
            </p>
          </div>

          <div className="p-8">
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="text-6xl mb-4">📬</div>
              
              {/* Main Message */}
              <div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                  Send Us Your Details
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We'd love to hear from you! Send an email with the following information:
                </p>
              </div>

              {/* Email Box */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Email us at:</p>
                <div className="flex items-center justify-center gap-3">
                  <a
                    href="mailto:oppenheimer.6thaug@gmail.com"
                    className="text-xl font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
                  >
                    oppenheimer.6thaug@gmail.com
                  </a>
                  <button
                    onClick={handleCopyEmail}
                    className="p-2 hover:bg-purple-100 dark:hover:bg-purple-800/50 rounded-lg transition"
                    title="Copy email"
                  >
                    {copied ? (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* What to Include */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-600 rounded-lg p-5 text-left">
                <p className="font-semibold text-blue-900 dark:text-blue-300 mb-3">📝 Please include:</p>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                  <li>• Your full name</li>
                  <li>• Email address & phone number</li>
                  <li>• Your connection to IIT Mandi (Faculty/Alumni/Staff/etc.)</li>
                  <li>• Why you want to join BYTE-CHAT</li>
                  <li>• Attach your ID proof (Faculty ID, Alumni Card, etc.)</li>
                </ul>
              </div>

              {/* Response Time */}
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-300">
                  <strong>✨ We'll review your request</strong> and get back to you within 2-3 business days!
                </p>
              </div>

              {/* Back to Login */}
              <div className="pt-4">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Login
                </Link>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="px-8 pb-6">
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <Link 
                  href="/terms" 
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Terms & Conditions
                </Link>
                <span>•</span>
                <Link 
                  href="/privacy" 
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link 
                  href="/contact" 
                  className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Contact Developers
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-white/90 dark:text-white/80 text-sm">
          <p>We will review all applications carefully. You'll hear from us, Just Trust.</p>
        </div>
      </div>
    </div>
  );
}
