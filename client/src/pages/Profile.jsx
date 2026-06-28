import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Camera,
  Globe,
  Bell,
  Save,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
  // Profile fields states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  
  // Notification fields states
  const [enableNotifications, setEnableNotifications] = useState(user?.notificationSettings?.enableNotifications ?? true);
  const [gracePeriod, setGracePeriod] = useState(user?.notificationSettings?.gracePeriod ?? 5);
  
  // Password change states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UX states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Standard common timezones list
  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];

  // Base64 file reader helper
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password && password !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    const payload = {
      name,
      email,
      profilePicture,
      timezone,
      notificationSettings: {
        enableNotifications,
        gracePeriod: parseInt(gracePeriod)
      }
    };

    if (password) {
      payload.password = password;
    }

    try {
      const result = await updateProfile(payload);
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(result.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 min-h-screen relative">
      <div className="bg-glow-purple top-10 left-10" />

      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-glass-border-light pb-6">
        <Link to="/" className="p-2.5 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-950/5 border border-glass-border-light text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Settings</span>
          <h1 className="font-display text-2xl font-bold text-white dark:text-white light:text-slate-900 flex items-center space-x-2">
            <User className="w-5 h-5 text-violet-400" />
            <span>Profile Settings</span>
          </h1>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Profile Pic Upload (4 cols) */}
        <div className="md:col-span-4 glass-panel p-6 rounded-3xl flex flex-col items-center space-y-4">
          <div className="relative group">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={name}
                className="w-32 h-32 rounded-full border-2 border-violet-500/30 object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-3xl font-bold font-display shadow-lg shadow-violet-500/20">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute bottom-0 right-0 p-2.5 bg-violet-600 hover:bg-violet-500 border border-white/10 text-white rounded-full cursor-pointer shadow-md transition-all group-hover:scale-105">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
          <div className="text-center">
            <h3 className="font-display font-bold text-white dark:text-white light:text-slate-900">{name}</h3>
            <p className="text-xs text-slate-400 mt-1">{email}</p>
          </div>
        </div>

        {/* Right Column: Fields configuration (8 cols) */}
        <div className="md:col-span-8 space-y-8">
          {/* Section 1: User Account */}
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <h3 className="font-display text-sm font-bold text-white dark:text-white light:text-slate-950 uppercase tracking-widest border-b border-glass-border-light pb-2">
              Account Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-400 mb-2 uppercase">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 glass-input text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-400 mb-2 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 glass-input text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Localization & Timezone */}
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <h3 className="font-display text-sm font-bold text-white dark:text-white light:text-slate-950 uppercase tracking-widest border-b border-glass-border-light pb-2">
              Timezone & Localization
            </h3>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-400 mb-2 uppercase">Preferred Timezone</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full pl-10 glass-input text-sm appearance-none pr-10 cursor-pointer"
                >
                  {!commonTimezones.includes(timezone) && (
                    <option value={timezone}>{timezone} (Current)</option>
                  )}
                  {commonTimezones.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                All deadlines and reports sync to this timezone automatically.
              </p>
            </div>
          </div>

          {/* Section 3: Notification Settings */}
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <h3 className="font-display text-sm font-bold text-white dark:text-white light:text-slate-950 uppercase tracking-widest border-b border-glass-border-light pb-2">
              Notification Configs
            </h3>

            <div className="space-y-4">
              {/* Enable toggle */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableNotifications}
                  onChange={(e) => setEnableNotifications(e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded bg-white/5 border border-glass-border-light cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-violet-400" />
                  <span>Enable Browser Notifications</span>
                </span>
              </label>

              {/* Grace period input */}
              <div className="flex flex-col max-w-[200px]">
                <label className="text-xs font-semibold text-slate-400 mb-2 uppercase">Grace Period (Minutes)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(e.target.value)}
                  className="glass-input text-sm font-mono"
                />
                <p className="text-[9px] text-slate-500 mt-1">
                  Delay before tasks are marked as missed.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Security Password */}
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <h3 className="font-display text-sm font-bold text-white dark:text-white light:text-slate-950 uppercase tracking-widest border-b border-glass-border-light pb-2">
              Security
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-400 mb-2 uppercase">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 glass-input text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-400 mb-2 uppercase">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 glass-input text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-8 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-700 text-white rounded-xl font-semibold text-sm flex items-center space-x-2 cursor-pointer shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
