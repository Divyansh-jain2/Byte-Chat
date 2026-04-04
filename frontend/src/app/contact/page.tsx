'use client';

import Link from 'next/link';
import { FiGithub, FiMail, FiCode } from 'react-icons/fi';
import Image from 'next/image';

interface Developer {
  id: number;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  email: string;
  expertise: string[];
  color: string;
}

const developers: Developer[] = [
  {
    id: 1,
    name: 'Divyansh Jain',
    role: 'Team Lead & Frontend Developer',
    avatar: 'https://ui-avatars.com/api/?name=Divyansh+Jain&background=3b82f6&color=fff&size=200&bold=true',
    bio: 'Leading the development team and crafting the user interface. Coordinating project milestones, managing workflows, and ensuring seamless integration between frontend and backend systems.',
    email: 'b23397@students.iitmandi.ac.in',
    expertise: ['Next.js', 'React', 'UI Design', 'Project Management', 'Team Coordination'],
    color: 'blue',
  },
  {
    id: 2,
    name: 'Siddhi Pogakwar',
    role: 'Frontend Developer',
    avatar: 'https://ui-avatars.com/api/?name=Siddhi+Pogakwar&background=ec4899&color=fff&size=200&bold=true',
    bio: 'Creating responsive and intuitive user interfaces with modern design principles. Focused on delivering exceptional user experiences through clean code and beautiful designs.',
    email: 'b23415@students.iitmandi.ac.in',
    expertise: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Responsive Design', 'Component Architecture'],
    color: 'pink',
  },
  {
    id: 3,
    name: 'Anamika Godara',
    role: 'Database Engineer',
    avatar: 'https://ui-avatars.com/api/?name=Anamika+Godara&background=10b981&color=fff&size=200&bold=true',
    bio: 'Designing and optimizing database schemas for optimal performance. Managing data models, writing efficient queries, and ensuring data integrity across the platform.',
    email: 'b23428@students.iitmandi.ac.in',
    expertise: ['PostgreSQL', 'Database Design', 'Query Optimization', 'Data Modeling', 'Supabase'],
    color: 'green',
  },
  {
    id: 4,
    name: 'Thacker Vyom',
    role: 'Database Engineer',
    avatar: 'https://ui-avatars.com/api/?name=Thacker+Vyom&background=f59e0b&color=fff&size=200&bold=true',
    bio: 'Implementing robust database solutions and cloud storage integrations. Specializing in media management, data persistence, and ensuring high availability of services.',
    email: 'b23417@students.iitmandi.ac.in',
    expertise: ['PostgreSQL', 'Cloudinary', 'Database Security', 'Cloud Storage', 'Data Migration'],
    color: 'yellow',
  },
  {
    id: 5,
    name: 'Raj Maurya',
    role: 'Backend Developer',
    avatar: 'https://ui-avatars.com/api/?name=Raj+Maurya&background=8b5cf6&color=fff&size=200&bold=true',
    bio: 'Building scalable APIs and real-time communication systems. Developing backend services, implementing WebSocket connections, and ensuring smooth server-side operations.',
    email: 'b23406@students.iitmandi.ac.in',
    expertise: ['Express.js', 'Socket.io', 'Real-time Communication'],
    color: 'purple',
  },
];

const techStack = [
  { name: 'Next.js', icon: '⚡', desc: 'Frontend framework' },
  { name: 'Node.js', icon: '🟩', desc: 'Backend runtime' },
  { name: 'PostgreSQL', icon: '🐘', desc: 'Database' },
  { name: 'Socket.io', icon: '🔌', desc: 'Real-time events' },
  { name: 'Tailwind CSS', icon: '🎨', desc: 'Styling' },
  { name: 'TypeScript', icon: '📘', desc: 'Type safety' },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-mesh-warm antialiased py-12 px-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-linear-to-tr from-purple-300/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-linear-to-br from-orange-300/8 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Back nav */}
        <div className="mb-6">
          <Link href="/" className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm">
            ← Back to Home
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ background: 'var(--grad-romance)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Meet Our Team
          </h1>
          <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--body)' }}>
            BYTE-CHAT is built by a passionate team of IIT Mandi students. Meet the people behind the platform.
          </p>
        </div>

        {/* Developer cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {developers.map((dev) => (
            <div key={dev.id} className="glass-card rounded-3xl p-5 flex flex-col gap-4 animate-scale-in">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 ring-2 ring-white/20">
                  <Image src={dev.avatar} alt={dev.name} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--heading)' }}>{dev.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{dev.role}</p>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs leading-relaxed" style={{ color: 'var(--body)' }}>{dev.bio}</p>

              {/* Expertise tags */}
              <div className="flex flex-wrap gap-1.5">
                {dev.expertise.map((skill) => (
                  <span key={skill}
                    className="glass rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ color: 'var(--body)' }}>
                    {skill}
                  </span>
                ))}
              </div>

              {/* Email link */}
              <a
                href={`mailto:${dev.email}`}
                className="btn-romance flex items-center justify-center gap-2 py-2 text-xs font-semibold mt-auto"
              >
                <FiMail className="w-3.5 h-3.5" />
                {dev.email}
              </a>
            </div>
          ))}
        </div>

        {/* About + Get in Touch row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* About the Project */}
          <div className="glass-strong rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiCode className="w-5 h-5" style={{ color: 'var(--pink)' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--heading)' }}>About the Project</h2>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--body)' }}>
              BYTE-CHAT is a campus social platform built exclusively for IIT Mandi students. It provides a safe space for students to connect, communicate, and collaborate.
            </p>
            <ul className="space-y-2">
              {[
                'Secure, college-only authentication',
                'Real-time messaging and group chats',
                'Anonymous chat features',
                'Profile and group management',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--body)' }}>
                  <span style={{ color: 'var(--pink)' }}>✦</span>{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Get in Touch */}
          <div className="glass-strong rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiGithub className="w-5 h-5" style={{ color: 'var(--pink)' }} />
              <h2 className="text-lg font-bold" style={{ color: 'var(--heading)' }}>Get in Touch</h2>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--body)' }}>
              Have questions, suggestions, or want to collaborate? Reach out to us!
            </p>
            <div className="space-y-3">
              <a
                href="mailto:b23397@students.iitmandi.ac.in"
                className="btn-romance flex items-center justify-center gap-2 py-2.5 text-sm font-semibold"
              >
                <FiMail className="w-4 h-4" />
                Send us an Email
              </a>
              <Link href="/impress-us" className="btn-ghost flex items-center justify-center gap-2 py-2.5 text-sm">
                ✨ Impress Us
              </Link>
            </div>
          </div>
        </div>

        {/* Tech stack */}
        <div className="glass-strong rounded-3xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 text-center" style={{ color: 'var(--heading)' }}>Tech Stack</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {techStack.map((tech) => (
              <div key={tech.name} className="glass rounded-2xl p-3 flex items-center gap-3">
                <span className="text-2xl">{tech.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>{tech.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: 'var(--muted)' }}>
            <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <span>·</span>
            <Link href="/encryption" className="hover:underline">Security</Link>
            <span>·</span>
            <Link href="/" className="hover:underline">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
