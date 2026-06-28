import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, AlertCircle, CheckSquare } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const result = await register(name, email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center px-4 py-16 overflow-hidden bg-[#070514]">
      {/* Animated Background glow orbs */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-violet-600/15 blur-[90px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.15, 1, 1.15],
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-fuchsia-600/15 blur-[90px] pointer-events-none"
      />

      <motion.div
        initial={{ y: 25, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md glass-panel p-10 rounded-3xl relative z-10 border border-white/10 shadow-2xl shadow-violet-950/20 backdrop-blur-xl bg-slate-950/40"
      >
        {/* App Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 6 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-violet-500/20 mb-4 border border-white/10"
          >
            <CheckSquare className="w-6 h-6 stroke-[2.5]" />
          </motion.div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-100 to-fuchsia-100">
            Create Account
          </h2>
          <p className="text-slate-400 text-sm mt-2 text-center max-w-xs">
            Start tracking, structuring, and optimizing your daily performance today.
          </p>
        </div>

        {/* Error Box */}
        {error && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start space-x-2.5"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name input */}
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Full Name
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-[15px] w-5 h-5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-white placeholder-slate-600 text-sm outline-none focus:border-violet-500 focus:bg-violet-950/10 focus:ring-2 focus:ring-violet-500/5 transition-all"
              />
            </div>
          </div>

          {/* Email input */}
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-[15px] w-5 h-5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-white placeholder-slate-600 text-sm outline-none focus:border-violet-500 focus:bg-violet-950/10 focus:ring-2 focus:ring-violet-500/5 transition-all"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-[15px] w-5 h-5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-white placeholder-slate-600 text-sm outline-none focus:border-violet-500 focus:bg-violet-950/10 focus:ring-2 focus:ring-violet-500/5 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.01, y: -0.5 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all duration-200 border border-white/10"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign Up & Start Tracking</span>
                <ArrowRight className="w-4 h-4 animate-pulse" />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-violet-400 hover:text-violet-300 hover:underline transition-colors"
          >
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
