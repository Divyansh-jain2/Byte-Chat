'use client';

import Link from 'next/link';
import { FiGithub, FiLinkedin, FiMail, FiCode } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

interface Developer {
  id: number;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  email: string;
  github?: string;
  linkedin?: string;
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
    name: 'Anamika',
    role: 'Database Engineer',
    avatar: 'https://ui-avatars.com/api/?name=Anamika&background=10b981&color=fff&size=200&bold=true',
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

const colorVariants: Record<string, { gradient: string; glow: string; text: string; badge: string }> = {
  blue: { 
    gradient: 'from-blue-500/20 to-blue-600/20',
    glow: 'shadow-blue-500/20',
    text: 'text-blue-300',
    badge: 'bg-blue-500/10 border-blue-400/50 text-blue-200'
  },
  pink: { 
    gradient: 'from-pink-500/20 to-pink-600/20',
    glow: 'shadow-pink-500/20',
    text: 'text-pink-300',
    badge: 'bg-pink-500/10 border-pink-400/50 text-pink-200'
  },
  green: { 
    gradient: 'from-green-500/20 to-green-600/20',
    glow: 'shadow-green-500/20',
    text: 'text-green-300',
    badge: 'bg-green-500/10 border-green-400/50 text-green-200'
  },
  yellow: { 
    gradient: 'from-yellow-500/20 to-yellow-600/20',
    glow: 'shadow-yellow-500/20',
    text: 'text-yellow-300',
    badge: 'bg-yellow-500/10 border-yellow-400/50 text-yellow-200'
  },
  purple: { 
    gradient: 'from-purple-500/20 to-purple-600/20',
    glow: 'shadow-purple-500/20',
    text: 'text-purple-300',
    badge: 'bg-purple-500/10 border-purple-400/50 text-purple-200'
  },
};

export default function ContactPage() {
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

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 animate-gradient">
            Meet Our Team
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            We're a team of passionate college students building Digital Campus Psychology to connect and empower our campus community.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-white/70">
            <FiCode className="text-2xl" />
            <span className="text-lg">Built with ❤️ by students, for students</span>
          </div>
        </div>

        {/* Developer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {developers.map((dev) => {
            const colors = colorVariants[dev.color];
            return (
              <div key={dev.id} className="relative group">
                {/* Glow Effect */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${colors.gradient} rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Main Card */}
                <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-2xl border-2 border-white/20 shadow-2xl shadow-black/20 overflow-hidden transform transition-all duration-300 hover:scale-105">
                  {/* Card Header with Avatar */}
                  <div className={`bg-gradient-to-br ${colors.gradient} backdrop-blur-sm p-6 text-center border-b border-white/10`}>
                    <img
                      src={dev.avatar}
                      alt={dev.name}
                      className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white/30 shadow-xl"
                    />
                    <h3 className="text-2xl font-bold text-white">{dev.name}</h3>
                    <p className={`${colors.text} font-semibold mt-1`}>{dev.role}</p>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <p className="text-white/80 mb-4 leading-relaxed">{dev.bio}</p>

                    {/* Expertise Tags */}
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-white/90 mb-2">Expertise:</p>
                      <div className="flex flex-wrap gap-2">
                        {dev.expertise.map((skill, index) => (
                          <span
                            key={index}
                            className={`${colors.badge} px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Contact Links */}
                    <div className="flex gap-3 mt-6">
                      <a
                        href={`mailto:${dev.email}`}
                        className={`flex-1 flex items-center justify-center gap-2 ${colors.badge} py-2 px-4 rounded-lg hover:scale-105 transition-all duration-300 font-medium border backdrop-blur-sm`}
                        title="Send Email"
                      >
                        <FiMail />
                        <span className="text-sm">Email</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* About the Project */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-2xl border-2 border-white/20 shadow-2xl shadow-black/20 p-8">
              <h2 className="text-3xl font-bold text-white mb-4">About This Project</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Digital Campus Psychology is a student-led initiative created as part of our{' '}
                <strong className="text-white">Applied Database Practicum</strong> course. Our goal is to build a platform that 
                helps college students connect, communicate, and build meaningful relationships within the campus community.
              </p>
              <p className="text-white/80 leading-relaxed">
                This project combines modern web technologies, database design principles, and user-centric 
                design to create a safe, engaging, and feature-rich social platform exclusively for students.
              </p>
            </div>
          </div>

          {/* Get in Touch */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-2xl border-2 border-white/20 shadow-2xl shadow-black/20 p-8">
              <h2 className="text-3xl font-bold text-white mb-4">Get in Touch</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We'd love to hear from you! Whether you have questions, feedback, bug reports, 
                or feature suggestions, feel free to reach out to any of our team members.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FiMail className="text-blue-300 mt-1 flex-shrink-0 text-xl" />
                  <div>
                    <p className="font-semibold text-white">General Inquiries</p>
                    <a href="mailto:b23397@students.iitmandi.ac.in" className="text-blue-300 hover:text-blue-200 underline transition-colors">
                      b23397@students.iitmandi.ac.in
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiCode className="text-green-300 mt-1 flex-shrink-0 text-xl" />
                  <div>
                    <p className="font-semibold text-white">Report a Bug</p>
                    <a href="mailto:b23417@students.iitmandi.ac.in" className="text-green-300 hover:text-green-200 underline transition-colors">
                      b23417@students.iitmandi.ac.in
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FiGithub className="text-purple-300 mt-1 flex-shrink-0 text-xl" />
                  <div>
                    <p className="font-semibold text-white">Contribute on GitHub</p>
                    <a href="https://github.com/dummy" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline transition-colors">
                      github.com/dummy
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="relative group mb-12">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-2xl blur-2xl"></div>
          <div className="relative bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-2xl rounded-2xl border-2 border-white/30 shadow-2xl p-8">
            <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">Our Tech Stack</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-2 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300">
                  <p className="text-2xl font-bold text-white">Next.js</p>
                </div>
                <p className="text-sm text-white/70">Frontend Framework</p>
              </div>
              <div className="text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-2 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300">
                  <p className="text-2xl font-bold text-white">Node.js</p>
                </div>
                <p className="text-sm text-white/70">Backend Runtime</p>
              </div>
              <div className="text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-2 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300">
                  <p className="text-2xl font-bold text-white">PostgreSQL</p>
                </div>
                <p className="text-sm text-white/70">Database</p>
              </div>
              <div className="text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-2 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300">
                  <p className="text-2xl font-bold text-white">Socket.io</p>
                </div>
                <p className="text-sm text-white/70">Real-time Chat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="text-center">
          <div className="inline-flex flex-wrap gap-4 justify-center bg-white/10 backdrop-blur-2xl border-2 border-white/20 rounded-2xl shadow-xl px-8 py-4">
            <Link
              href="/terms"
              className="text-blue-300 hover:text-blue-200 hover:underline font-medium transition-colors"
            >
              Terms & Conditions
            </Link>
            <span className="text-white/40">•</span>
            <Link
              href="/privacy"
              className="text-blue-300 hover:text-blue-200 hover:underline font-medium transition-colors"
            >
              Privacy Policy
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
  );
}
