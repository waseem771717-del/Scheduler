import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Key, ArrowRight, AlertCircle, CheckCircle, CheckSquare } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = Request code, 2 = Reset password
  const [devCode, setDevCode] = useState(''); // Exposed in UI for dev mode
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Reset code generated successfully!');
        if (data.resetCode) {
          setDevCode(data.resetCode); // Store for copy-paste convenience in UI
        }
        setStep(2);
      } else {
        setError(data.message || 'Failed to request reset code');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Password updated successfully! Redirecting...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background glow orbs */}
      <div className="bg-glow-purple top-1/4 left-1/3" />
      <div className="bg-glow-blue bottom-1/4 right-1/3" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10"
      >
        {/* App Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-500/20 mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
            Reset Password
          </h2>
          <p className="text-slate-400 dark:text-slate-400 light:text-slate-500 text-sm mt-1">
            {step === 1 ? 'Enter your email to get a reset code' : 'Enter the verification code and your new password'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start space-x-2"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start space-x-2"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        {/* Dev Code Bypass Warning */}
        {step === 2 && devCode && (
          <div className="mb-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-slate-300 text-sm">
            <p className="font-semibold text-violet-400 mb-1">Development mode active:</p>
            <p>
              Your password reset verification code is:{' '}
              <strong className="text-white select-all bg-white/10 px-2 py-0.5 rounded font-mono">{devCode}</strong>
            </p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-5">
            {/* Email input */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-600 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 glass-input text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-700 text-white rounded-xl font-medium text-sm flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-violet-500/20 transition-all duration-200"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Request Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* Code input */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-600 mb-2 uppercase tracking-wider">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-11 glass-input text-sm tracking-widest font-mono font-bold"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-600 mb-2 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-11 glass-input text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-700 text-white rounded-xl font-medium text-sm flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-violet-500/20 transition-all duration-200"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400 dark:text-slate-400 light:text-slate-500">
          Back to{' '}
          <Link
            to="/login"
            className="font-medium text-violet-400 hover:text-violet-300 hover:underline transition-colors"
          >
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
