'use client';

import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { FaShieldAlt, FaSun, FaMoon } from 'react-icons/fa';

export default function PrivacyPolicy() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-2xl hover:scale-110 transition-all duration-300 shadow-lg shadow-blue-500/20"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <FaSun className="text-yellow-300 text-xl" />
        ) : (
          <FaMoon className="text-blue-300 text-xl" />
        )}
      </button>

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl"></div>
          
          {/* Main Card */}
          <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-2xl border-2 border-white/20 shadow-2xl shadow-black/20 p-8 sm:p-12">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="inline-block mb-4">
                <FaShieldAlt className="text-6xl text-blue-400" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 animate-gradient">
                Privacy Policy
              </h1>
              <p className="text-white/70 text-lg">Last Updated: February 10, 2026</p>
            </div>

            {/* Content */}
            <div className="space-y-8">
              {/* Introduction */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">Our Commitment to Your Privacy</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  At Digital Campus Psychology, we understand that your privacy is important. This Privacy Policy explains how we collect, 
                  use, protect, and handle your personal information. We are committed to transparency and protecting your data.
                </p>
                <div className="bg-blue-500/10 border-l-4 border-blue-400/50 p-4 rounded-r-xl backdrop-blur-sm">
                  <p className="text-white/90">
                    <strong className="text-blue-300">Important:</strong> We are a student-built platform for college students. We do not sell your data 
                    to third parties and only use your information to provide and improve our services.
                  </p>
                </div>
              </section>

              {/* Information We Collect */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">1. Information We Collect</h2>
                
                <h3 className="text-2xl font-semibold text-white/90 mb-3">1.1 Information You Provide</h3>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4 mb-4">
                  <li><strong className="text-white">Account Information:</strong> Roll number, name, email, gender, branch, date of birth</li>
                  <li><strong className="text-white">Profile Information:</strong> Bio, profile picture, preferences</li>
                  <li><strong className="text-white">Messages & Content:</strong> Text messages, group chats, anonymous conversations</li>
                  <li><strong className="text-white">Settings:</strong> Privacy preferences, notification settings, theme preferences</li>
                </ul>

                <h3 className="text-2xl font-semibold text-white/90 mb-3">1.2 Automatically Collected Information</h3>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li><strong className="text-white">Usage Data:</strong> Login times, features used, pages visited</li>
                  <li><strong className="text-white">Device Information:</strong> Browser type, operating system, IP address</li>
                  <li><strong className="text-white">Activity Data:</strong> Online status, last seen (if enabled)</li>
                </ul>
              </section>

              {/* How We Use Information */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li>Provide and maintain the platform</li>
                  <li>Enable communication between students</li>
                  <li>Verify your identity and college affiliation</li>
                  <li>Personalize your experience</li>
                  <li>Send notifications about messages and activities</li>
                  <li>Improve platform features and functionality</li>
                  <li>Ensure platform security and prevent abuse</li>
                  <li>Respond to your inquiries and support requests</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              {/* Information Sharing */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">3. Information Sharing & Disclosure</h2>
                <div className="bg-green-500/10 border-l-4 border-green-400/50 p-4 mb-4 rounded-r-xl backdrop-blur-sm">
                  <p className="text-white/90">
                    <strong className="text-green-300">We DO NOT sell your personal information to third parties.</strong>
                  </p>
                </div>
                
                <h3 className="text-2xl font-semibold text-white/90 mb-3">3.1 Public Information</h3>
                <p className="text-white/80 leading-relaxed mb-4">
                  The following information is visible to other verified users:
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4 mb-4">
                  <li>Your name, roll number, branch</li>
                  <li>Profile picture and bio</li>
                  <li>Public group memberships</li>
                  <li>Online status (if enabled in settings)</li>
                </ul>

                <h3 className="text-2xl font-semibold text-white/90 mb-3">3.2 We May Share Information:</h3>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li><strong className="text-white">With Your Consent:</strong> When you explicitly agree to share information</li>
                  <li><strong className="text-white">For Legal Reasons:</strong> To comply with laws, court orders, or legal processes</li>
                  <li><strong className="text-white">Safety & Security:</strong> To protect users from harm, fraud, or illegal activities</li>
                  <li><strong className="text-white">Service Providers:</strong> Third-party services that help us operate (e.g., Cloudinary for images, Supabase for database)</li>
                </ul>
              </section>

              {/* User Responsibility */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">4. Your Responsibility for Conversations</h2>
                <div className="bg-yellow-500/10 border-l-4 border-yellow-400/50 p-4 mb-4 rounded-r-xl backdrop-blur-sm">
                  <p className="text-white/90">
                    <strong className="text-yellow-300">Important Disclaimer:</strong> You are solely responsible for all conversations, messages, and content you create or share on this platform.
                  </p>
                </div>
                <p className="text-white/80 leading-relaxed mb-4">
                  <strong className="text-white">We are NOT responsible for:</strong>
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li>The content of your messages and conversations</li>
                  <li>How other users interpret or respond to your messages</li>
                  <li>Agreements, relationships, or conflicts arising from your interactions</li>
                  <li>Any emotional, psychological, or personal consequences of your conversations</li>
                  <li>Information you choose to share with other users</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-4">
                  <strong className="text-white">Remember:</strong> All users are college students and should be mature enough to handle their own communications responsibly. 
                  Think before you send, and treat others with respect.
                </p>
              </section>

              {/* Data Security */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">5. Data Security</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  We implement security measures to protect your information:
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li>Encrypted passwords using industry-standard hashing (Argon2)</li>
                  <li>HTTPS encryption for data transmission</li>
                  <li>Secure database with access controls</li>
                  <li>Regular security audits and updates</li>
                  <li>Two-factor authentication options (where available)</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-4">
                  <strong className="text-white">However:</strong> No system is 100% secure. We cannot guarantee absolute security, and you use the platform at your own risk.
                </p>
              </section>

              {/* Anonymous Features */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">6. Anonymous Features & Privacy</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  Our platform offers anonymous chat and identity features:
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li>Anonymous identities hide your real identity from other users</li>
                  <li>Anonymous messages do not display your name or profile</li>
                  <li>We maintain records of anonymous activity for safety purposes</li>
                  <li>In cases of abuse or legal issues, we reserve the right to reveal identities</li>
                  <li>Anonymity is not absolute and can be lifted if necessary</li>
                </ul>
              </section>

              {/* Your Privacy Rights */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">7. Your Privacy Rights & Controls</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  You have the following rights regarding your data:
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li><strong className="text-white">Access:</strong> View and download your personal information</li>
                  <li><strong className="text-white">Update:</strong> Correct or update your profile information</li>
                  <li><strong className="text-white">Delete:</strong> Request deletion of your account and data</li>
                  <li><strong className="text-white">Control Visibility:</strong> Adjust privacy settings for profile, online status, last seen</li>
                  <li><strong className="text-white">Block Users:</strong> Block or report users who violate policies</li>
                  <li><strong className="text-white">Opt-out:</strong> Disable notifications or certain features</li>
                </ul>
              </section>

              {/* Data Retention */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">8. Data Retention</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  We retain your information for as long as:
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li>Your account is active</li>
                  <li>Needed to provide services</li>
                  <li>Required by law or for legal purposes</li>
                  <li>Necessary for safety and security investigations</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-4">
                  When you delete your account, we will delete or anonymize your personal information within 30 days, 
                  except where we are required to retain it for legal reasons.
                </p>
              </section>

              {/* Third-Party Services */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">9. Third-Party Services</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  We use the following third-party services:
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li><strong className="text-white">Cloudinary:</strong> For image storage and optimization</li>
                  <li><strong className="text-white">Supabase:</strong> For authentication and database services</li>
                  <li><strong className="text-white">Email Services:</strong> For verification and notifications</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-4">
                  These services have their own privacy policies. We encourage you to review them.
                </p>
              </section>

              {/* Cookies */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">10. Cookies & Tracking</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc list-inside text-white/80 space-y-2 ml-4">
                  <li>Keep you logged in</li>
                  <li>Remember your preferences</li>
                  <li>Understand how you use the platform</li>
                  <li>Improve platform performance</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-4">
                  You can control cookies through your browser settings, but some features may not work properly without them.
                </p>
              </section>

              {/* Children's Privacy */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">11. Age Requirement</h2>
                <p className="text-white/80 leading-relaxed">
                  This platform is intended for college students aged 18 and above. We do not knowingly collect information 
                  from individuals under 18. If we discover that we have collected information from someone under 18, 
                  we will delete it immediately.
                </p>
              </section>

              {/* Changes to Policy */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">12. Changes to This Privacy Policy</h2>
                <p className="text-white/80 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of significant changes by posting 
                  a notice on the platform or sending you an email. Your continued use of the platform after changes 
                  constitutes acceptance of the updated policy.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="text-3xl font-bold text-white mb-4">13. Contact Us</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  If you have questions or concerns about this Privacy Policy or how we handle your data, please{' '}
                  <Link href="/contact" className="text-blue-300 hover:text-blue-200 underline transition-colors">
                    contact our development team
                  </Link>.
                </p>
              </section>

              {/* Summary */}
              <section>
                <div className="bg-blue-500/10 border-l-4 border-blue-400/50 p-4 rounded-r-xl backdrop-blur-sm">
                  <h3 className="text-xl font-semibold text-white mb-2">In Summary</h3>
                  <ul className="text-white/90 space-y-1">
                    <li>✓ We collect only necessary information</li>
                    <li>✓ We do NOT sell your data</li>
                    <li>✓ You control your privacy settings</li>
                    <li>✓ You are responsible for your conversations</li>
                    <li>✓ We prioritize your security</li>
                    <li>✓ You can delete your account anytime</li>
                  </ul>
                </div>
              </section>
            </div>

            {/* Footer Navigation */}
            <div className="mt-12 pt-6 border-t border-white/20 flex flex-wrap gap-4 justify-center">
              <Link
                href="/terms"
                className="text-blue-300 hover:text-blue-200 hover:underline font-medium transition-colors"
              >
                Terms & Conditions
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
    </div>
  );
}
