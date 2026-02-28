'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';

export default function CompleteProfile() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
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
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      theme === 'dark' 
        ? 'bg-linear-to-br from-gray-900 via-purple-900 to-gray-900' 
        : 'bg-linear-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-6 right-6 p-3 rounded-full backdrop-blur-md transition-all ${
          theme === 'dark'
            ? 'bg-white/10 hover:bg-white/20 text-white'
            : 'bg-white/50 hover:bg-white/70 text-gray-800'
        }`}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className={`w-full max-w-2xl backdrop-blur-md rounded-2xl shadow-2xl p-8 ${
        theme === 'dark'
          ? 'bg-white/10 border border-white/20'
          : 'bg-white/60 border border-white/40'
      }`}>
        <h1 className={`text-4xl font-bold mb-2 text-center ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>
          Complete Your Profile 🎨
        </h1>
        <p className={`text-center mb-8 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Add some details to personalize your BYTE-CHAT experience
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              {formData.dpUrl && (
                <Image
                  src={formData.dpUrl}
                  alt="Profile Preview"
                  width={128}
                  height={128}
                  className="rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className={`w-full p-3 rounded-lg backdrop-blur-sm transition-all ${
                    theme === 'dark'
                      ? 'bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-purple-400'
                      : 'bg-white/50 border border-gray-300 text-gray-800 placeholder-gray-500 focus:border-purple-500'
                  }`}
                  disabled={uploadingImage}
                />
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Max 2MB, JPG/PNG
                </p>
              </div>
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dob" className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Date of Birth *
            </label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
              className={`w-full p-3 rounded-lg backdrop-blur-sm transition-all ${
                theme === 'dark'
                  ? 'bg-white/10 border border-white/20 text-white focus:border-purple-400'
                  : 'bg-white/50 border border-gray-300 text-gray-800 focus:border-purple-500'
              }`}
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Bio (Max 500 characters)
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              maxLength={500}
              rows={4}
              placeholder="Tell us about yourself..."
              className={`w-full p-3 rounded-lg backdrop-blur-sm transition-all resize-none ${
                theme === 'dark'
                  ? 'bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-purple-400'
                  : 'bg-white/50 border border-gray-300 text-gray-800 placeholder-gray-500 focus:border-purple-500'
              }`}
            />
            <p className={`text-xs mt-1 text-right ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {formData.bio.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || uploadingImage}
            className="w-full p-4 rounded-lg font-semibold text-white bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Completing Profile...
              </span>
            ) : (
              'Complete Profile →'
            )}
          </button>

          {/* Skip Button */}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className={`w-full p-4 rounded-lg font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
