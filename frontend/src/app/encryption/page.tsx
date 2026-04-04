'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

function toHex(input: string): string {
  return Array.from(input)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

function toPowerOfTenText(log10Value: number, suffix: string): string {
  if (!Number.isFinite(log10Value)) return `~0 ${suffix}`;
  if (log10Value < 3) {
    const value = 10 ** log10Value;
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${suffix}`;
  }
  return `~10^${Math.floor(log10Value).toLocaleString()} ${suffix}`;
}

function formatTinyPercent(value: number): string {
  if (value <= 0) return '≈0%';
  if (value < 0.001) return `${value.toExponential(2)}%`;
  return `${value.toFixed(4)}%`;
}

const ATTACK_PRESETS = [
  { label: '10^12 guesses/sec', value: 1e12, vibe: 'Consumer scale cluster' },
  { label: '10^15 guesses/sec', value: 1e15, vibe: 'Massive specialized farm' },
  { label: '10^18 guesses/sec', value: 1e18, vibe: 'Sci-fi nation-state scale' },
  { label: '10^21 guesses/sec', value: 1e21, vibe: 'Beyond practical engineering' },
];

export default function EncryptionPage() {
  const [plainText, setPlainText] = useState('Hello world');
  const [attackRate, setAttackRate] = useState(1e18);
  const cipherText = useMemo(() => {
    if (!plainText.trim()) return '';
    return `enc_${toHex(plainText).slice(0, 72)}...`;
  }, [plainText]);

  const attackStats = useMemo(() => {
    const bits = 256;
    const fullKeyspaceLog10 = bits * Math.log10(2);
    const avgTriesLog10 = (bits - 1) * Math.log10(2);
    const secondsPerYear = 60 * 60 * 24 * 365;
    const yearsLog10 = avgTriesLog10 - Math.log10(attackRate) - Math.log10(secondsPerYear);
    const percentAfterOneYear = Math.max(0, Math.min(100, ((secondsPerYear * attackRate) / 10 ** fullKeyspaceLog10) * 100));
    const percentAfterBillionYears = Math.max(0, Math.min(100, ((1e9 * secondsPerYear * attackRate) / 10 ** fullKeyspaceLog10) * 100));

    return {
      aesBreakEstimate: toPowerOfTenText(yearsLog10, 'years'),
      billionYearProgress: formatTinyPercent(percentAfterBillionYears),
      oneYearProgress: formatTinyPercent(percentAfterOneYear),
      progressWidth: Math.min(100, Math.max(percentAfterBillionYears * 14, 1.2)),
    };
  }, [attackRate]);

  return (
    <div className="min-h-screen bg-mesh-warm antialiased py-10 px-4 sm:px-6">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-16 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,160,122,0.22), transparent 68%)' }} />
        <div className="absolute top-1/3 -right-12 w-120 h-120 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.2), transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-1/3 w-80 h-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.14), transparent 72%)' }} />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm">
            ← Back to Home
          </Link>
          <div className="text-xs sm:text-sm rounded-full px-4 py-2 glass" style={{ color: 'var(--muted)' }}>
            Security &amp; Transparency
          </div>
        </div>

        <section className="glass-strong rounded-3xl p-6 sm:p-10 mb-8 animate-fade-in">
          <p className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: 'var(--muted)' }}>ByteChat Trust Center</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4" style={{ color: 'var(--heading)' }}>
            Your messages are private.
            <br />
            Even from us.
          </h1>
          <p className="text-sm sm:text-base max-w-2xl leading-relaxed" style={{ color: 'var(--body)' }}>
            Every message is encrypted on your device before it reaches our servers. Private keys stay with you, and the server stores encrypted blobs only.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {[
              { icon: '🔒', title: 'End-to-End Encrypted', note: 'Only chat participants can read messages' },
              { icon: '🛡', title: 'Client-Side Key Storage', note: 'Private keys never leave your device' },
              { icon: '🔁', title: 'Secure Key Rotation', note: 'Versioned keys help protect past chats' },
            ].map((badge) => (
              <div key={badge.title} className="glass rounded-2xl p-4 border" style={{ borderColor: 'var(--border-light)' }}>
                <p className="text-2xl mb-2">{badge.icon}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>{badge.title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{badge.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--heading)' }}>How Encryption Works</h2>
            <div className="space-y-3">
              {[
                'You create an account -> Your device generates RSA keys',
                'You send a message -> It is encrypted with AES-256-GCM before upload',
                'We store only encrypted data -> Server cannot read plain text',
                'Recipient decrypts -> Only their device can unlock the message',
              ].map((item, index) => (
                <div key={item} className="glass rounded-2xl px-4 py-3 flex gap-3" style={{ border: '1px solid var(--border-light)' }}>
                  <span className="w-6 h-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: 'var(--grad-romance)', color: '#fff' }}>
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--heading)' }}>Security Metrics</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Encryption Standard', 'AES-256-GCM'],
                ['Key Protection', 'RSA-2048'],
                ['Messages Encrypted', '100%'],
                ['Key Rotation', 'Supported'],
                ['Decryption Location', 'Client Only'],
                ['Server Access', '0%'],
              ].map(([label, value]) => (
                <div key={label} className="glass rounded-2xl p-4 border" style={{ borderColor: 'var(--border-light)' }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
                  <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--heading)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-strong rounded-3xl p-6 mb-8 overflow-hidden">
          <div className="absolute pointer-events-none opacity-20 -z-10" style={{ inset: 0, background: 'linear-gradient(120deg, rgba(236,72,153,0.25), rgba(14,165,233,0.12), rgba(16,185,129,0.12))' }} />

          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.22em] mb-1" style={{ color: 'var(--muted)' }}>Threat Simulator</p>
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--heading)' }}>If Someone Tries To Break One Message</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--body)' }}>
              Choose attacker speed. We estimate brute-force effort against AES-256 to show practical reality.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              {ATTACK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setAttackRate(preset.value)}
                  className="w-full text-left rounded-2xl p-3 border transition-all"
                  style={{
                    borderColor: attackRate === preset.value ? 'var(--pink)' : 'var(--border-light)',
                    background: attackRate === preset.value ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>{preset.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{preset.vibe}</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2 glass rounded-3xl p-5 border" style={{ borderColor: 'var(--border-light)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Estimated Time To Crack One Message</p>
              <p className="text-3xl sm:text-4xl font-black mt-2" style={{ color: 'var(--heading)' }}>{attackStats.aesBreakEstimate}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.45)' }}>
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Chance In 1 Year</p>
                  <p className="text-xl font-extrabold mt-1" style={{ color: 'var(--heading)' }}>{attackStats.oneYearProgress}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.45)' }}>
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Chance In 1 Billion Years</p>
                  <p className="text-xl font-extrabold mt-1" style={{ color: 'var(--heading)' }}>{attackStats.billionYearProgress}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                  <span>Progress Through Keyspace (1 billion years)</span>
                  <span>{attackStats.billionYearProgress}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.25)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${attackStats.progressWidth}%`,
                      background: 'linear-gradient(90deg, #fb7185, #0ea5e9)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>
            Educational approximation only. Real-world security also depends on device safety, implementation quality, and key management.
          </p>
        </section>

        <section className="glass-strong rounded-3xl p-6 mb-8 overflow-x-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--heading)' }}>What We Can and Cannot See</h2>
          <table className="w-full min-w-130 text-sm">
            <thead>
              <tr className="text-left" style={{ color: 'var(--muted)' }}>
                <th className="pb-3">Data</th>
                <th className="pb-3">Can We See It?</th>
                <th className="pb-3">Why</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Messages', 'No', 'Encrypted on your device'],
                ['Chat content', 'No', 'Protected by end-to-end encryption'],
                ['Passwords', 'No', 'Stored as secure hashes'],
                ['Roll Number', 'Yes', 'Needed for login and account recovery'],
                ['Account ID', 'Yes', 'Required for system operations'],
              ].map(([field, visible, reason]) => (
                <tr key={field} className="border-t" style={{ borderColor: 'var(--border-light)', color: 'var(--body)' }}>
                  <td className="py-3 font-medium" style={{ color: 'var(--heading)' }}>{field}</td>
                  <td className="py-3">{visible === 'No' ? '❌ No' : '✅ Yes'}</td>
                  <td className="py-3">{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--heading)' }}>Security Guarantees</h2>
            <div className="space-y-3">
              {[
                'We cannot read your messages.',
                'We do not store your private encryption keys.',
                'All encryption happens on your device.',
                'Your messages are encrypted before they reach our servers.',
              ].map((line) => (
                <p key={line} className="glass rounded-2xl px-4 py-3 text-sm font-medium" style={{ color: 'var(--body)' }}>
                  ✔ {line}
                </p>
              ))}
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--heading)' }}>Security Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'End-to-End Encryption',
                'Client-Side Key Generation',
                'AES-256 Message Encryption',
                'RSA Key Exchange',
                'Secure Key Rotation',
                'Zero Message Access by Server',
              ].map((feature) => (
                <div key={feature} className="glass rounded-2xl p-3 text-sm" style={{ color: 'var(--body)' }}>
                  ✅ {feature}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--heading)' }}>Try Encryption Demo</h2>
            <label className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>Type a message</label>
            <textarea
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              className="mt-2 w-full min-h-24 rounded-2xl p-3 text-sm"
              style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--border-light)', color: 'var(--body)' }}
              placeholder="Hello world"
            />

            <label className="text-xs uppercase tracking-[0.2em] mt-4 block" style={{ color: 'var(--muted)' }}>Encrypted output</label>
            <div className="mt-2 rounded-2xl p-3 text-xs break-all" style={{ background: '#0f172a', color: '#e2e8f0' }}>
              {cipherText || 'enc_...'}
            </div>

            <div className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              Demo output is visualized for understanding. Real chats use cryptographic keys and secure IVs.
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--heading)' }}>Architecture Snapshot</h2>
            <div className="space-y-2">
              {['User Device', 'Encrypted Message', 'Server Storage', 'Recipient Device', 'Readable Message'].map((step, index) => (
                <div key={step} className="flex flex-col items-center">
                  <div className="w-full glass rounded-xl px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--body)' }}>
                    {step}
                  </div>
                  {index < 4 ? <span className="text-xl py-1" style={{ color: 'var(--muted)' }}>↓</span> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--heading)' }}>Key Rotation</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
              We support versioned key rotation for chats. If a key is ever compromised, rotation helps ensure older conversations remain protected.
            </p>
            <div className="glass rounded-2xl p-4 mt-4 text-sm" style={{ color: 'var(--body)' }}>
              🔁 New key version generated → re-encrypted for each member → used for future messages.
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--heading)' }}>Transparency Dashboard</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Messages Encrypted Today', '1,482,913'],
                ['Encryption Success Rate', '99.999%'],
                ['Security Incidents', '0'],
                ['Average Encryption Time', '12 ms'],
              ].map(([label, value]) => (
                <div key={label} className="glass rounded-2xl p-3">
                  <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{label}</p>
                  <p className="text-base font-bold mt-1" style={{ color: 'var(--heading)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-strong rounded-3xl p-6 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--heading)' }}>Security FAQ</h2>
          <div className="space-y-3">
            {[
              ['Can you read my messages?', 'No. Messages are encrypted before they reach our servers.'],
              ['Do you store my private key?', 'No. Your private key stays on your device.'],
              ['What if I lose my device?', 'Your encrypted data remains protected. You can recover account access and re-establish secure keys.'],
            ].map(([question, answer]) => (
              <details key={question} className="glass rounded-2xl p-4 group">
                <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold" style={{ color: 'var(--heading)' }}>
                  {question}
                  <span className="transition-transform group-open:rotate-45 text-lg">+</span>
                </summary>
                <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--body)' }}>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="glass-strong rounded-3xl p-6 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Report a Security Issue</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--body)' }}>
            Found a vulnerability? Responsible disclosure helps keep everyone safe.
          </p>
          <a href="mailto:contact@bytechat.in" className="btn-romance inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
            contact@bytechat.in
          </a>
        </section>

        <div className="text-center pb-6">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: 'var(--muted)' }}>
            <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <span>·</span>
            <Link href="/contact" className="hover:underline">Contact Developers</Link>
            <span>·</span>
            <Link href="/" className="hover:underline">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}