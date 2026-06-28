import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import Clock from '../components/Clock';
import {
  CalendarDays,
  CalendarRange,
  Flame,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock as ClockIcon
} from 'lucide-react';

const Dashboard = () => {
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const localDate = new Date().toISOString().split('T')[0];
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/reports/dashboard?date=${localDate}&timezone=${timezone}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-pulse">
        <div className="h-28 bg-white/5 rounded-2xl border border-glass-border-light w-1/3 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl border border-glass-border-light" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 bg-white/5 rounded-3xl border border-glass-border-light" />
          <div className="h-64 bg-white/5 rounded-3xl border border-glass-border-light" />
        </div>
      </div>
    );
  }

  // Fallback defaults
  const todayProgress = stats?.todayProgress || { percentage: 0, completed: 0, total: 0 };
  const weekProgress = stats?.weekProgress || { percentage: 0, completed: 0, total: 0 };
  const monthProgress = stats?.monthProgress || { percentage: 0, completed: 0, total: 0 };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10 relative">
      {/* Glow overlays */}
      <div className="bg-glow-purple -top-10 -left-10" />
      <div className="bg-glow-blue -bottom-10 -right-10" />

      {/* Clock section */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <Clock />
      </motion.div>

      {/* Stats Board */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* KPI 1: Productivity */}
        <motion.div variants={cardVariants} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase tracking-wider">Productivity</span>
            <h3 className="text-3xl font-display font-bold text-white dark:text-white light:text-slate-900">
              {stats?.productivityPercentage ?? 0}%
            </h3>
            <p className="text-xs text-slate-500">Lifetime completion rate</p>
          </div>
          <div className="relative w-14 h-14">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" className="stroke-white/5 dark:stroke-white/5 light:stroke-slate-900/5 fill-none" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24"
                className="stroke-violet-500 fill-none transition-all duration-1000"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - (stats?.productivityPercentage ?? 0) / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <TrendingUp className="w-5 h-5 absolute inset-0 m-auto text-violet-400" />
          </div>
        </motion.div>

        {/* KPI 2: Streaks */}
        <motion.div variants={cardVariants} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase tracking-wider">Streak</span>
            <h3 className="text-3xl font-display font-bold text-white dark:text-white light:text-slate-900 flex items-baseline space-x-1">
              <span>{stats?.currentStreak ?? 0}</span>
              <span className="text-xs text-slate-400 font-normal">days</span>
            </h3>
            <p className="text-xs text-slate-500">Longest: {stats?.longestStreak ?? 0} days</p>
          </div>
          <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 text-orange-400">
            <Flame className="w-6 h-6 fill-orange-500/10" />
          </div>
        </motion.div>

        {/* KPI 3: Completed */}
        <motion.div variants={cardVariants} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase tracking-wider">Completed Tasks</span>
            <h3 className="text-3xl font-display font-bold text-emerald-400">
              {stats?.completedTasks ?? 0}
            </h3>
            <p className="text-xs text-slate-500">Total tasks checked off</p>
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </motion.div>

        {/* KPI 4: Pending */}
        <motion.div variants={cardVariants} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 light:text-slate-500 uppercase tracking-wider">Pending Tasks</span>
            <h3 className="text-3xl font-display font-bold text-amber-400">
              {stats?.pendingTasksToday ?? 0}
            </h3>
            <p className="text-xs text-slate-500">Unchecked tasks for today</p>
          </div>
          <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <ClockIcon className="w-6 h-6" />
          </div>
        </motion.div>
      </motion.div>

      {/* Progress Bars */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="glass-panel p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        {/* Today */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">Today's Progress</span>
            <span className="text-slate-400">{todayProgress.percentage}% ({todayProgress.completed}/{todayProgress.total})</span>
          </div>
          <div className="w-full bg-white/5 dark:bg-white/5 light:bg-slate-900/5 h-2.5 rounded-full overflow-hidden">
            <div className="bg-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${todayProgress.percentage}%` }} />
          </div>
        </div>

        {/* Week */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">Weekly Progress</span>
            <span className="text-slate-400">{weekProgress.percentage}% ({weekProgress.completed}/{weekProgress.total})</span>
          </div>
          <div className="w-full bg-white/5 dark:bg-white/5 light:bg-slate-900/5 h-2.5 rounded-full overflow-hidden">
            <div className="bg-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${weekProgress.percentage}%` }} />
          </div>
        </div>

        {/* Month */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">Monthly Progress</span>
            <span className="text-slate-400">{monthProgress.percentage}% ({monthProgress.completed}/{monthProgress.total})</span>
          </div>
          <div className="w-full bg-white/5 dark:bg-white/5 light:bg-slate-900/5 h-2.5 rounded-full overflow-hidden">
            <div className="bg-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${monthProgress.percentage}%` }} />
          </div>
        </div>
      </motion.div>

      {/* Main launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Special Day card */}
        <motion.div
          whileHover={{ y: -6 }}
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.1 }}
          onClick={() => navigate('/special-schedule')}
          className="glass-panel-interactive p-8 rounded-3xl flex flex-col justify-between h-80 cursor-pointer group relative overflow-hidden"
        >
          {/* Accent light highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl group-hover:bg-violet-600/20 transition-all duration-300" />
          
          <div className="space-y-4">
            <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-400 border border-violet-500/20 group-hover:scale-110 transition-transform duration-300">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-white dark:text-white light:text-slate-900">
                Special Day Schedule
              </h2>
              <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-500 leading-relaxed max-w-sm">
                Create a customized, single-day task sequence for specific dates. Perfect for exams, project sprints, or events.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm font-semibold text-violet-400 group-hover:text-violet-300 transition-colors">
            <span>Configure Day</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Weekly schedule card */}
        <motion.div
          whileHover={{ y: -6 }}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.1 }}
          onClick={() => navigate('/weekly-schedule')}
          className="glass-panel-interactive p-8 rounded-3xl flex flex-col justify-between h-80 cursor-pointer group relative overflow-hidden"
        >
          {/* Accent light highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-600/10 rounded-full blur-2xl group-hover:bg-fuchsia-600/20 transition-all duration-300" />

          <div className="space-y-4">
            <div className="w-12 h-12 bg-fuchsia-500/10 rounded-2xl flex items-center justify-center text-fuchsia-400 border border-fuchsia-500/20 group-hover:scale-110 transition-transform duration-300">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-white dark:text-white light:text-slate-900">
                Weekly Schedule Routine
              </h2>
              <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-500 leading-relaxed max-w-sm">
                Define tasks that repeat weekly (Monday to Sunday). The system instantiates and evaluates them automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm font-semibold text-fuchsia-400 group-hover:text-fuchsia-300 transition-colors">
            <span>Configure Routine</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
