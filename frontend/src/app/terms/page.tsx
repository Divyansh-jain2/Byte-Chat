'use client';

import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function TermsAndConditions() {
  const { theme, toggleTheme } = useTheme();
  const { info: toastInfo } = useToast();

  return (
    <>
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{animationDuration: '5s'}}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{animationDuration: '7s', animationDelay: '1s'}}></div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-lg transition-all z-50 hover:scale-110"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>

      <div className="max-w-4xl mx-auto">
        <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_0_rgba(120,150,255,0.2)] p-10 border border-white/20">
          {/* Card glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-transparent rounded-3xl blur-xl opacity-50"></div>
          
          <div className="relative z-10">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-block mb-4 p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl border border-white/10">
            <svg className="w-12 h-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-teal-300 bg-clip-text text-transparent mb-3">Terms & Conditions</h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-blue-400/50 via-purple-400/50 to-teal-400/50 rounded-full mb-3"></div>
          <p className="text-white/70">Last Updated: February 10, 2026</p>
        </div>

    {/* Content */}
    <div className="prose prose-lg max-w-none text-white/90">
      {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Welcome to BYTE-CHAT</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              Welcome to our campus social platform! By accessing or using this application, you agree to be bound by these Terms and Conditions. 
              This platform is designed exclusively for college students to connect, communicate, and build a supportive campus community.
            </p>
          </section>

          {/* User Eligibility */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">1. User Eligibility</h2>
            <div className="bg-blue-500/10 border-l-4 border-blue-400/50 p-4 mb-4 rounded-r-xl backdrop-blur-sm">
              <p className="text-white/90">
                <strong className="text-blue-300">College Students Only:</strong> This platform is exclusively for currently enrolled college students. 
                You must use your official college email for registration.
              </p>
            </div>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
              <li>You must be at least 18 years of age</li>
              <li>You must be currently enrolled in a recognized educational institution</li>
              <li>You must verify your identity through your college email</li>
              <li>You agree to provide accurate and up-to-date information</li>
            </ul>
          </section>

          {/* User Conduct */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">2. User Conduct & Responsibilities</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              As a member of our campus community, you agree to:
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
              <li>Treat all users with respect and courtesy</li>
              <li>Use appropriate language in all communications</li>
              <li>Respect others' privacy and personal boundaries</li>
              <li>Not engage in harassment, bullying, or hate speech</li>
              <li>Not share inappropriate or offensive content</li>
              <li>Not impersonate others or create fake accounts</li>
              <li>Not use the platform for commercial or promotional purposes</li>
              <li>Report any violations of these terms to administrators</li>
            </ul>
          </section>

          {/* Content Disclaimer */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">3. Content Disclaimer</h2>
            <div className="bg-yellow-500/10 border-l-4 border-yellow-400/50 p-4 mb-4 rounded-r-xl backdrop-blur-sm">
              <p className="text-white/90">
                <strong className="text-yellow-300">Important:</strong> All conversations, messages, and content shared on this platform are the sole responsibility of the users who create them.
              </p>
            </div>
            <p className="text-white/80 leading-relaxed mb-4">
              <strong className="text-white">We are NOT responsible for:</strong>
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
              <li>Any conversations, messages, or content shared between users</li>
              <li>The accuracy, completeness, or reliability of user-generated content</li>
              <li>Any agreements, arrangements, or relationships formed through the platform</li>
              <li>Any disputes, conflicts, or issues arising from user interactions</li>
              <li>Any emotional, psychological, or physical consequences of using the platform</li>
              <li>Loss of data, messages, or content due to technical issues</li>
            </ul>
          </section>

          {/* Privacy & Data */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">4. Privacy & Data</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              Your privacy is important to us. Please review our{' '}
              <Link href="/privacy" className="text-blue-300 hover:text-blue-200 underline transition-colors">
                Privacy Policy
              </Link>{' '}
              to understand how we collect, use, and protect your information.
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
              <li>We collect only necessary information for platform functionality</li>
              <li>We do not sell your personal information to third parties</li>
              <li>You can delete your account and data at any time</li>
              <li>Messages may be monitored for safety and security purposes</li>
            </ul>
          </section>

          {/* Anonymous Features */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">5. Anonymous Features</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              Our platform offers anonymous chat features. While we respect your desire for anonymity:
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
              <li>Anonymity does not grant permission to abuse, harass, or harm others</li>
              <li>We reserve the right to reveal identities in cases of serious violations</li>
              <li>Illegal activities will be reported to appropriate authorities</li>
              <li>Repeated violations may result in permanent account suspension</li>
            </ul>
          </section>

          {/* Groups & Communities */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">6. Groups & Communities</h2>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
              <li>Group creators and admins are responsible for moderating their groups</li>
              <li>We may remove groups that violate our policies</li>
              <li>Public groups are visible to all platform users</li>
              <li>Private groups require invitation to join</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">7. Intellectual Property</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              <strong className="text-white">Your Content:</strong> You retain ownership of any content you create and share on the platform.
            </p>
            <p className="text-white/80 leading-relaxed mb-4">
              <strong className="text-white">Platform Content:</strong> All platform features, design, and functionality are owned by Digital Campus Psychology 
              and protected by copyright and intellectual property laws.
            </p>
          </section>

          {/* Account Termination */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">8. Account Termination</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We reserve the right to suspend or terminate accounts that:
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
              <li>Violate these Terms and Conditions</li>
              <li>Engage in abusive or harmful behavior</li>
              <li>Share inappropriate or illegal content</li>
              <li>Attempt to hack, spam, or disrupt the platform</li>
              <li>Are inactive for extended periods (after notification)
                <button
                  className="ml-2 text-xs text-blue-300 underline hover:text-blue-200"
                  onClick={() => toastInfo('You will be notified if your account is inactive for a long period.')}
                  type="button"
                >
                  What does this mean?
                </button>
              </li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">9. Limitation of Liability</h2>
            <div className="bg-red-500/10 border-l-4 border-red-400/50 p-4 mb-4 rounded-r-xl backdrop-blur-sm">
              <p className="text-white/90">
                <strong className="text-red-300">Platform "As Is":</strong> This platform is provided "as is" without warranties of any kind.
              </p>
            </div>
            <p className="text-white/80 leading-relaxed mb-4">
              <strong className="text-white">We are not liable for:</strong>
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
              <li>Any damages resulting from use or inability to use the platform</li>
              <li>Loss of data, profits, or opportunities</li>
              <li>Unauthorized access to your account</li>
              <li>Platform downtime or technical issues</li>
              <li>Actions or content of other users</li>
              <li>Third-party services or integrations</li>
            </ul>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">10. Changes to Terms</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting. 
              Your continued use of the platform constitutes acceptance of the modified terms.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">11. Governing Law</h2>
            <p className="text-white/80 leading-relaxed">
              These Terms and Conditions are governed by and construed in accordance with applicable local laws. 
              Any disputes shall be resolved through appropriate legal channels.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">12. Contact Us</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              If you have questions about these Terms and Conditions, please{' '}
              <Link href="/contact" className="text-blue-300 hover:text-blue-200 underline transition-colors">
                contact our development team
              </Link>.
            </p>
          </section>

          {/* Acceptance */}
          <section className="mb-8">
            <div className="bg-green-500/10 border-l-4 border-green-400/50 p-4 rounded-r-xl backdrop-blur-sm">
              <p className="text-white/90">
                <strong>By using this platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</strong>
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-6 border-t border-white/20 flex flex-wrap gap-4 justify-center">
          <Link
            href="/privacy"
            className="text-blue-300 hover:text-blue-200 hover:underline font-medium transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-white/40">•</span>
          <Link
            href="/contact"
            className="text-blue-300 hover:text-blue-200 hover:underline font-medium transition-colors"
          >
            Contact Developers
          </Link>
          <span className="text-white/40">•</span>
          <Link
            href="/"
            className="text-blue-300 hover:text-blue-200 hover:underline font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
          </div>
        </div>
      </div>
    </>
  );
}
