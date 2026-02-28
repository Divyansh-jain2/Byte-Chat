'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import '../profile.css';

export default function CompleteProfile() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    dob: '',
    bio: '',
    dpUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      // Create form data for upload
      const uploadData = new FormData();
      uploadData.append('file', file);

      // For now, using placeholder
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          dpUrl: reader.result as string
        });
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);

    } 
    catch (err) {
      setError('Failed to upload image');
      setUploadingImage(false);
      console.log(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/profile/complete', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.message || 'Failed to complete profile');
      }
    } 
    catch (err) {
      setError('Something went wrong. Please try again.');
      console.log(err);
    } 
    finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-warm antialiased flex items-center justify-center p-4">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-linear-to-tr from-purple-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎨</div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Complete Your Profile</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Add details to personalize your BYTE-CHAT experience</p>
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 glass rounded-2xl p-4 bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile Picture */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                {formData.dpUrl ? (
                  <Image src={formData.dpUrl} alt="Preview" width={72} height={72}
                    className="w-18 h-18 rounded-2xl object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: 'var(--glass-bg)' }}>👤</div>
                )}
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={handleImageUpload}
                    disabled={uploadingImage} className="input-romance w-full text-sm py-2 cursor-pointer" />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Max 2MB · JPG/PNG</p>
                  {uploadingImage && <p className="text-xs mt-1" style={{ color: 'var(--pink)' }}>Uploading…</p>}
                </div>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Date of Birth *
              </label>
              <input type="date" id="dob" name="dob" value={formData.dob}
                onChange={handleChange} required className="input-romance w-full" />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Bio <span className="normal-case font-normal">(optional, max 500 chars)</span>
              </label>
              <textarea id="bio" name="bio" value={formData.bio} onChange={handleChange}
                maxLength={500} rows={4} placeholder="Tell us about yourself…"
                className="input-romance w-full resize-none" />
              <p className="text-xs mt-1 text-right" style={{ color: 'var(--muted)' }}>{formData.bio.length}/500</p>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading || uploadingImage} className="profile-btn-primary w-full py-3 text-base font-semibold">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Completing…
                </span>
              ) : 'Complete Profile →'}
            </button>

            {/* Skip */}
            <button type="button" onClick={() => router.push('/dashboard')} className="btn-ghost w-full py-3 text-sm">
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
