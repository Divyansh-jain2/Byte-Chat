import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-mesh-warm antialiased overflow-x-hidden">

      {/* ── Floating Blob Decorations ─────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-150 h-150 bg-linear-to-br from-pink-300/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-125 h-125 bg-linear-to-br from-orange-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-[10%] w-100 h-100 bg-linear-to-br from-purple-300/12 to-transparent rounded-full blur-3xl" />
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="glass-nav fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--grad-romance)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--heading)' }}>
              Byte<span className="text-gradient-romance">Chat</span>
            </span>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-pink-50 dark:hover:bg-stone-800"
              style={{ color: 'var(--body)' }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn-romance px-5 py-2.5 text-sm rounded-xl font-semibold text-white"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────── */}
      <section className="pt-36 pb-24 px-5 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8 glass border" style={{ borderColor: 'rgba(255,107,157,0.2)', color: 'var(--pink)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Exclusively for IIT Mandi Students
          </div>

          {/* Headline */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold leading-[1.05] mb-6 tracking-tight">
            <span style={{ color: 'var(--heading)' }}>Connect.</span>
            <br />
            <span className="text-gradient-romance">Chat.</span>{' '}
            <span style={{ color: 'var(--heading)' }}>Create.</span>
          </h1>

          <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'var(--body)' }}>
            Your campus, your conversations. Chat openly, anonymously, or in groups — whisper secrets or shout ideas. ByteChat is where campus life happens.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-romance inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-2xl">
              Start Chatting Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/login" className="btn-ghost inline-flex items-center justify-center gap-2 px-8 py-4 text-base rounded-2xl" style={{ color: 'var(--pink)' }}>
              I have an account
            </Link>
          </div>
        </div>

        {/* Hero Glass Card Preview */}
        <div className="mt-20 max-w-3xl mx-auto animate-slide-up delay-300">
          <div className="glass-card p-6 text-left">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--grad-romance)' }}>DJ</div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--heading)' }}>Divyansh Jain</p>
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--green)' }}>
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> Online
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,107,157,0.1)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--pink)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Chat bubbles */}
            <div className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--grad-trust)' }}>RK</div>
                <div className="bubble-received px-4 py-2.5 text-sm max-w-[70%]" style={{ color: 'var(--heading)' }}>
                  Hey! Did you see the assignment for tomorrow? 😅
                </div>
              </div>
              <div className="flex gap-2 items-end justify-end">
                <div className="bubble-sent px-4 py-2.5 text-sm max-w-[70%]">
                  Yep! Want to study together at the library? 📚
                </div>
              </div>
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--grad-trust)' }}>RK</div>
                <div className="bubble-received px-4 py-2.5 text-sm" style={{ color: 'var(--heading)' }}>
                  <span className="typing-dot">●</span>
                  <span className="typing-dot">●</span>
                  <span className="typing-dot">●</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ──────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span style={{ color: 'var(--heading)' }}>Why </span>
              <span className="text-gradient-romance">ByteChat?</span>
            </h2>
            <p className="text-lg" style={{ color: 'var(--muted)' }}>Everything you need to connect with your campus community.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card p-8 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--grad-romance)' }}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Real-time Chat</h3>
              <p className="leading-relaxed" style={{ color: 'var(--body)' }}>Instant messaging with read receipts, typing indicators and emoji reactions. Just like you love it.</p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8 animate-fade-in delay-150">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--grad-mystery)' }}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Anonymous Mode</h3>
              <p className="leading-relaxed" style={{ color: 'var(--body)' }}>Express freely with a secret identity. Reveal yourself when you`re ready — or stay mysterious forever.</p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 animate-fade-in delay-300">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--grad-ocean)' }}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Group Spaces</h3>
              <p className="leading-relaxed" style={{ color: 'var(--body)' }}>Create or join study groups, clubs, and communities. Public or private — your call.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Section ─────────────────────────────────── */}
      <section className="py-16 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong rounded-3xl p-10">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-4xl font-extrabold text-gradient-romance">500+</p>
                <p className="text-sm mt-1 font-medium" style={{ color: 'var(--muted)' }}>Students</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold text-gradient-purple">100%</p>
                <p className="text-sm mt-1 font-medium" style={{ color: 'var(--muted)' }}>IIT Mandi</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold text-gradient-ocean">∞</p>
                <p className="text-sm mt-1 font-medium" style={{ color: 'var(--muted)' }}>Conversations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="py-12 px-5 text-center">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--grad-romance)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--heading)' }}>ByteChat</span>
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Made with ❤️ for IIT Mandi</p>
          <div className="flex items-center justify-center gap-6 text-sm" style={{ color: 'var(--muted)' }}>
            <Link href="/terms" className="hover:text-pink-500 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-pink-500 transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-pink-500 transition-colors">Contact</Link>
            <Link href="/impress-us" className="hover:text-pink-500 transition-colors">✨ Impress Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
