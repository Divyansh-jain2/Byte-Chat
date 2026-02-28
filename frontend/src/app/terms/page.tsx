'use client';

import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

export default function TermsAndConditions() {
  const { info: toastInfo } = useToast();

  return (
    <div className="min-h-screen bg-mesh-warm antialiased py-12 px-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-linear-to-tr from-purple-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Back nav */}
        <div className="mb-6">
          <Link href="/" className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm">
            ← Back to Home
          </Link>
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-10 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">📋</div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--heading)' }}>
              Terms &amp; Conditions
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Last Updated: February 10, 2026</p>
          </div>

          <div className="space-y-8">
            {/* Welcome */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>Welcome to BYTE-CHAT</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                Welcome to our campus social platform! By accessing or using this application, you agree to be bound by these Terms and Conditions.
                This platform is designed exclusively for college students to connect, communicate, and build a supportive campus community.
              </p>
            </section>

            {/* 1. User Eligibility */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>1. User Eligibility</h2>
              <div className="glass rounded-2xl p-4 mb-4 border-l-4" style={{ borderLeftColor: 'var(--pink)' }}>
                <p className="text-sm" style={{ color: 'var(--body)' }}>
                  <strong style={{ color: 'var(--heading)' }}>College Students Only:</strong>{' '}
                  This platform is exclusively for currently enrolled college students. You must use your official college email for registration.
                </p>
              </div>
              <ul className="space-y-2 ml-2">
                {[
                  'You must be at least 18 years of age',
                  'You must be currently enrolled in a recognized educational institution',
                  'You must verify your identity through your college email',
                  'You agree to provide accurate and up-to-date information',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 2. User Conduct */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>2. User Conduct &amp; Responsibilities</h2>
              <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>As a member of our campus community, you agree to:</p>
              <ul className="space-y-2 ml-2">
                {[
                  "Treat all users with respect and courtesy",
                  "Use appropriate language in all communications",
                  "Respect other's privacy and personal boundaries",
                  "Not engage in harassment, bullying, or hate speech",
                  "Not share inappropriate or offensive content",
                  "Not impersonate others or create fake accounts",
                  "Not use the platform for commercial or promotional purposes",
                  "Report any violations of these terms to administrators",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 3. Content Disclaimer */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>3. Content Disclaimer</h2>
              <div className="glass rounded-2xl p-4 mb-4 border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
                <p className="text-sm" style={{ color: 'var(--body)' }}>
                  <strong style={{ color: 'var(--heading)' }}>Important:</strong>{' '}
                  All conversations, messages, and content shared on this platform are the sole responsibility of the users who create them.
                </p>
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>We are NOT responsible for:</p>
              <ul className="space-y-2 ml-2">
                {[
                  "Any conversations, messages, or content shared between users",
                  "The accuracy, completeness, or reliability of user-generated content",
                  "Any agreements, arrangements, or relationships formed through the platform",
                  "Any disputes, conflicts, or issues arising from user interactions",
                  "Any emotional, psychological, or physical consequences of using the platform",
                  "Loss of data, messages, or content due to technical issues",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 4. Privacy & Data */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>4. Privacy &amp; Data</h2>
              <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--body)' }}>
                Your privacy is important to us. Please review our{' '}
                <Link href="/privacy" className="underline hover:opacity-80" style={{ color: 'var(--pink)' }}>Privacy Policy</Link>{' '}
                to understand how we collect, use, and protect your information.
              </p>
              <ul className="space-y-2 ml-2">
                {[
                  "We collect only necessary information for platform functionality",
                  "We do not sell your personal information to third parties",
                  "You can delete your account and data at any time",
                  "Messages may be monitored for safety and security purposes",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 5. Anonymous Features */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>5. Anonymous Features</h2>
              <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>
                Our platform offers anonymous chat features. While we respect your desire for anonymity:
              </p>
              <ul className="space-y-2 ml-2">
                {[
                  "Anonymity does not grant permission to abuse, harass, or harm others",
                  "We reserve the right to reveal identities in cases of serious violations",
                  "Illegal activities will be reported to appropriate authorities",
                  "Repeated violations may result in permanent account suspension",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 6. Groups & Communities */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>6. Groups &amp; Communities</h2>
              <ul className="space-y-2 ml-2">
                {[
                  "Group creators and admins are responsible for moderating their groups",
                  "We may remove groups that violate our policies",
                  "Public groups are visible to all platform users",
                  "Private groups require invitation to join",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 7. Intellectual Property */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>7. Intellectual Property</h2>
              <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--body)' }}>
                <strong style={{ color: 'var(--heading)' }}>Your Content:</strong>{' '}
                You retain ownership of any content you create and share on the platform.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                <strong style={{ color: 'var(--heading)' }}>Platform Content:</strong>{' '}
                All platform features, design, and functionality are owned by Digital Campus Psychology and protected by copyright and intellectual property laws.
              </p>
            </section>

            {/* 8. Account Termination */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>8. Account Termination</h2>
              <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>We reserve the right to suspend or terminate accounts that:</p>
              <ul className="space-y-2 ml-2">
                {[
                  "Violate these Terms and Conditions",
                  "Engage in abusive or harmful behavior",
                  "Share inappropriate or illegal content",
                  "Attempt to hack, spam, or disrupt the platform",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                  <span style={{ color: 'var(--pink)' }}>✦</span>
                  Are inactive for extended periods (after notification)
                  <button
                    type="button"
                    onClick={() => toastInfo('You will be notified if your account is inactive for a long period.')}
                    className="ml-1 text-xs underline hover:opacity-80"
                    style={{ color: 'var(--pink)' }}
                  >
                    What does this mean?
                  </button>
                </li>
              </ul>
            </section>

            {/* 9. Limitation of Liability */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>9. Limitation of Liability</h2>
              <div className="glass rounded-2xl p-4 border-l-4" style={{ borderLeftColor: 'var(--coral)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                  This platform is provided &quot;as-is&quot; without warranties of any kind. We are not liable for any direct, indirect, incidental, or consequential damages resulting from your use of the platform, including but not limited to loss of data, missed connections, relationship outcomes, or academic consequences.
                </p>
              </div>
            </section>

            {/* 10. Changes to Terms */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>10. Changes to Terms</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                We reserve the right to modify these terms at any time. Users will be notified of significant changes via email or in-app notifications. Continued use of the platform after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            {/* 11. Governing Law */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>11. Governing Law</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                These terms are governed by the applicable laws of India. Any disputes will be resolved through appropriate legal channels in accordance with Indian law.
              </p>
            </section>

            {/* 12. Contact Us */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>12. Contact Us</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                If you have any questions about these Terms and Conditions, please contact us at{' '}
                <Link href="/contact" className="underline hover:opacity-80" style={{ color: 'var(--pink)' }}>our contact page</Link>
                {' '}or email us at{' '}
                <a href="mailto:B23417@students.iitmandi.ac.in" className="underline hover:opacity-80" style={{ color: 'var(--pink)' }}>
                  b23417@students.iitmandi.ac.in
                </a>.
              </p>
            </section>

            {/* Acceptance box */}
            <div className="glass rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--heading)' }}>✅ By using BYTE-CHAT, you accept these terms</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                If you do not agree, please discontinue use of the platform.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 flex flex-wrap items-center justify-center gap-4 text-sm"
            style={{ borderTop: '1px solid var(--border-light)' }}>
            <Link href="/privacy" className="hover:underline" style={{ color: 'var(--muted)' }}>Privacy Policy</Link>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <Link href="/contact" className="hover:underline" style={{ color: 'var(--muted)' }}>Contact Developers</Link>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <Link href="/" className="hover:underline" style={{ color: 'var(--muted)' }}>Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
