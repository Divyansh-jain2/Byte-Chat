import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white dark:bg-black border-b-4 border-neutral-900 dark:border-neutral-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-neutral-900 dark:bg-neutral-100 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center">
                <span className="text-neutral-100 dark:text-neutral-900 font-bold text-xl font-mono">#</span>
              </div>
              <span className="text-neutral-900 dark:text-neutral-100 font-bold text-2xl font-mono">[BYTE-CHAT]</span>
            </div>
            <div className="flex space-x-2">
              <Link
                href="/login"
                className="px-6 py-2 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100"
              >
                LOGIN
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-all font-mono font-bold"
              >
                SIGN UP
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          {/* Main Heading */}
          <div className="mb-12">
            <h1 className="text-7xl sm:text-8xl md:text-9xl font-bold text-neutral-900 dark:text-neutral-100 mb-6 tracking-tight font-mono">
              BYTE-CHAT
            </h1>
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="h-1 w-20 bg-neutral-900 dark:bg-neutral-100"></div>
              <p className="text-2xl sm:text-3xl text-neutral-700 dark:text-neutral-300 font-mono font-bold">
                WHERE EVERY BYTE IS HASHED
              </p>
              <div className="h-1 w-20 bg-neutral-900 dark:bg-neutral-100"></div>
            </div>
            <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed font-mono">
              Secure, encrypted messaging for IIT Mandi students. 
              Your conversations, cryptographically protected.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link
              href="/signup"
              className="px-10 py-4 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 text-lg font-bold border-4 border-neutral-900 dark:border-neutral-100 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all font-mono"
            >
              GET STARTED →
            </Link>
            <Link
              href="/login"
              className="px-10 py-4 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 text-lg font-bold border-4 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all font-mono"
            >
              LOGIN
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-8 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all">
              <div className="w-16 h-16 bg-neutral-900 dark:bg-neutral-100 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-10 h-10 text-neutral-100 dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">END-TO-END ENCRYPTED</h3>
              <p className="text-neutral-600 dark:text-neutral-400 font-mono text-sm">Every message is hashed and encrypted. Your privacy is our priority.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-8 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all">
              <div className="w-16 h-16 bg-linear-to-br from-neutral-700 to-neutral-900 dark:from-neutral-300 dark:to-neutral-100 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-10 h-10 text-neutral-100 dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">LIGHTNING FAST</h3>
              <p className="text-neutral-600 dark:text-neutral-400 font-mono text-sm">Real-time messaging optimized for speed and performance.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-8 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all">
              <div className="w-16 h-16 bg-linear-to-br from-neutral-600 to-neutral-800 dark:from-neutral-400 dark:to-neutral-200 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-10 h-10 text-neutral-100 dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">ANONYMOUS MODE</h3>
              <p className="text-neutral-600 dark:text-neutral-400 font-mono text-sm">Chat anonymously with complete privacy and identity protection.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 text-neutral-600 dark:text-neutral-400 font-mono text-sm">
            <p className="font-bold">NO ONE KNOWS WHAT`S GOING ON</p>
            <p className="mt-2">🔒 EVERY BYTE IS ENCRYPTED</p>
          </div>
        </div>
      </main>
    </div>
  );
}
