'use client';

import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

export default function PrivacyPolicy() {
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
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--heading)' }}>
              Privacy Policy
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Last Updated: February 10, 2026</p>
          </div>

          <div className="space-y-8">
            {/* Commitment */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>Our Commitment to Your Privacy</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--body)' }}>
                At Digital Campus Psychology, we understand that your privacy is important. This Privacy Policy explains how we collect,
                use, protect, and handle your personal information. We are committed to transparency and protecting your data.
              </p>
              <div className="glass rounded-2xl p-4 border-l-4" style={{ borderLeftColor: 'var(--pink)' }}>
                <p className="text-sm" style={{ color: 'var(--body)' }}>
                  <strong style={{ color: 'var(--heading)' }}>Important:</strong>{' '}
                  We are a student-built platform for college students. We do not sell your data to third parties and only use your information to provide and improve our services.
                </p>
              </div>
            </section>

            {/* 1. Information We Collect */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>1. Information We Collect</h2>

              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--heading)' }}>1.1 Information You Provide</h3>
              <ul className="space-y-2 ml-2 mb-4">
                {[
                  ['Account Information', 'Roll number, name, email, gender, branch, date of birth'],
                  ['Profile Information', 'Bio, profile picture, preferences'],
                  ['Messages & Content', 'Text messages, group chats, anonymous conversations'],
                ].map(([k, v], i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>
                    <span><strong style={{ color: 'var(--heading)' }}>{k}:</strong> {v}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                  <span style={{ color: 'var(--pink)' }}>✦</span>
                  <span>
                    <strong style={{ color: 'var(--heading)' }}>Settings:</strong> Privacy preferences, notification settings, theme preferences
                    <button
                      type="button"
                      onClick={() => toastInfo('You can adjust your notification and privacy settings in your profile.')}
                      className="ml-2 text-xs underline hover:opacity-80"
                      style={{ color: 'var(--pink)' }}
                    >
                      Learn more
                    </button>
                  </span>
                </li>
              </ul>

              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--heading)' }}>1.2 Automatically Collected Information</h3>
              <ul className="space-y-2 ml-2">
                {[
                  ['Usage Data', 'Login times, features used, pages visited'],
                  ['Device Information', 'Browser type, operating system, IP address'],
                  ['Activity Data', 'Online status, last seen (if enabled)'],
                ].map(([k, v], i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>
                    <span><strong style={{ color: 'var(--heading)' }}>{k}:</strong> {v}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 2. How We Use Information */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>2. How We Use Your Information</h2>
              <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>We use the information we collect to:</p>
              <ul className="space-y-2 ml-2">
                {[
                  'Provide and maintain the platform',
                  'Enable communication between students',
                  'Verify your identity and college affiliation',
                  'Personalize your experience',
                  'Improve platform features and functionality',
                  'Ensure platform security and prevent abuse',
                  'Respond to your inquiries and support requests',
                  'Comply with legal obligations',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                  <span style={{ color: 'var(--pink)' }}>✦</span>
                  <span>
                    Send notifications about messages and activities
                    <button
                      type="button"
                      onClick={() => toastInfo('You will receive notifications for important messages and activities.')}
                      className="ml-2 text-xs underline hover:opacity-80"
                      style={{ color: 'var(--pink)' }}
                    >
                      What notifications?
                    </button>
                  </span>
                </li>
              </ul>
            </section>

            {/* 3. Information Sharing */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>3. Information Sharing &amp; Disclosure</h2>
              <div className="glass rounded-2xl p-4 mb-4 border-l-4" style={{ borderLeftColor: '#10b981' }}>
                <p className="text-sm font-semibold" style={{ color: '#10b981' }}>
                  ✅ We DO NOT sell your personal information to third parties.
                </p>
              </div>

              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--heading)' }}>3.1 Public Information (visible to other users)</h3>
              <ul className="space-y-2 ml-2 mb-4">
                {['Your name, roll number, branch', 'Profile picture and bio', 'Public group memberships', 'Online status (if enabled in settings)'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>

              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--heading)' }}>3.2 We May Share Information:</h3>
              <ul className="space-y-2 ml-2">
                {[
                  ['With Your Consent', 'When you explicitly agree to share information'],
                  ['For Legal Reasons', 'To comply with laws, court orders, or legal processes'],
                  ['Safety & Security', 'To protect users from harm, fraud, or illegal activities'],
                  ['Service Providers', 'Third-party services that help us operate (e.g., Cloudinary for images, Supabase for database)'],
                ].map(([k, v], i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>
                    <span><strong style={{ color: 'var(--heading)' }}>{k}:</strong> {v}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 4. User Responsibility */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>4. Your Responsibility for Conversations</h2>
              <div className="glass rounded-2xl p-4 mb-4 border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
                <p className="text-sm" style={{ color: 'var(--body)' }}>
                  <strong style={{ color: 'var(--heading)' }}>Important Disclaimer:</strong>{' '}
                  You are solely responsible for all conversations, messages, and content you create or share on this platform.
                </p>
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>We are NOT responsible for:</p>
              <ul className="space-y-2 ml-2 mb-4">
                {[
                  'The content of your messages and conversations',
                  'How other users interpret or respond to your messages',
                  'Agreements, relationships, or conflicts arising from your interactions',
                  'Any emotional, psychological, or personal consequences of your conversations',
                  'Information you choose to share with other users',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                <strong style={{ color: 'var(--heading)' }}>Remember:</strong>{' '}
                All users are college students and should be mature enough to handle their own communications responsibly. Think before you send, and treat others with respect.
              </p>
            </section>

            {/* 5. Data Security */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>5. Data Security</h2>
              <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>We implement security measures to protect your information:</p>
              <ul className="space-y-2 ml-2 mb-3">
                {[
                  'Encrypted passwords using industry-standard hashing (Argon2)',
                  'HTTPS encryption for data transmission',
                  'Secure database with access controls',
                  'Regular security audits and updates',
                  'Two-factor authentication options (where available)',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
              <p className="text-sm" style={{ color: 'var(--body)' }}>
                <strong style={{ color: 'var(--heading)' }}>However:</strong> No system is 100% secure. We cannot guarantee absolute security, and you use the platform at your own risk.
              </p>
            </section>

            {/* 6. Anonymous Features */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>6. Anonymous Features &amp; Privacy</h2>
              <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>
                Our anonymous chat features allow users to interact without revealing their identity. However:
              </p>
              <ul className="space-y-2 ml-2">
                {[
                  'We still collect minimal data to maintain platform safety',
                  'Anonymous interactions are subject to the same code of conduct',
                  'We may reveal identities in cases of serious violations or legal requirements',
                  'Anonymity does not exempt you from legal responsibility',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 7. Your Privacy Rights */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>7. Your Privacy Rights</h2>
              <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>You have the right to:</p>
              <ul className="space-y-2 ml-2">
                {[
                  'Access your personal information',
                  'Correct inaccurate data',
                  'Delete your account and associated data',
                  'Opt out of certain data collection',
                  'Request data portability',
                  'Withdraw consent for data processing',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 8. Data Retention */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>8. Data Retention</h2>
              <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--body)' }}>
                We retain your data for as long as your account is active. After account deletion:
              </p>
              <ul className="space-y-2 ml-2">
                {[
                  'Personal information is deleted within 30 days',
                  'Messages may be anonymized rather than deleted to maintain conversation context',
                  'Legal obligations may require us to retain certain data longer',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>{item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 9. Third-Party Services */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>9. Third-Party Services</h2>
              <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>We use the following third-party services:</p>
              <ul className="space-y-2 ml-2">
                {[
                  ['Cloudinary', 'Image storage and optimization'],
                  ['Supabase', 'Database and authentication services'],
                ].map(([k, v], i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span style={{ color: 'var(--pink)' }}>✦</span>
                    <span><strong style={{ color: 'var(--heading)' }}>{k}:</strong> {v}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-3" style={{ color: 'var(--body)' }}>
                These services have their own privacy policies and we encourage you to review them.
              </p>
            </section>

            {/* 10. Cookies */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>10. Cookies &amp; Local Storage</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                We use cookies and local storage to maintain your session, remember your preferences, and improve your experience. You can disable cookies in your browser settings, but this may affect platform functionality.
              </p>
            </section>

            {/* 11. Age Requirement */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>11. Age Requirement</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                This platform is intended for users 18 years of age or older. We do not knowingly collect information from minors. If we discover that a user under 18 has created an account, we will delete their account and associated data.
              </p>
            </section>

            {/* 12. Changes */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>12. Changes to This Policy</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notifications. Your continued use of the platform after such changes constitutes your acceptance of the updated policy.
              </p>
            </section>

            {/* 13. Contact Us */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--heading)' }}>13. Contact Us</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
                If you have questions about this Privacy Policy or want to exercise your privacy rights, contact us at{' '}
                <Link href="/contact" className="underline hover:opacity-80" style={{ color: 'var(--pink)' }}>our contact page</Link>
                {' '}or email{' '}
                <a href="mailto:B23428@students.iitmandi.ac.in" className="underline hover:opacity-80" style={{ color: 'var(--pink)' }}>
                  b23428@students.iitmandi.ac.in
                </a>.
              </p>
            </section>

            {/* In Summary */}
            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-bold mb-3 text-center" style={{ color: 'var(--heading)' }}>🔒 In Summary</p>
              <ul className="space-y-2">
                {[
                  'We collect only what we need to run the platform',
                  'We never sell your personal data',
                  'You can delete your account and data anytime',
                  'Passwords are securely hashed with Argon2',
                  'You are responsible for your own conversations',
                  'We may update this policy — check back periodically',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--body)' }}>
                    <span>✅</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 flex flex-wrap items-center justify-center gap-4 text-sm"
            style={{ borderTop: '1px solid var(--border-light)' }}>
            <Link href="/terms" className="hover:underline" style={{ color: 'var(--muted)' }}>Terms &amp; Conditions</Link>
            <span style={{ color: 'var(--muted)' }}>·</span>
            <Link href="/encryption" className="hover:underline" style={{ color: 'var(--muted)' }}>Encryption</Link>
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
