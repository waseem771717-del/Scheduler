import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  User as UserIcon,
  LogOut,
  Sun,
  Moon,
  CheckSquare
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  if (!user) return null;

  const links = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full px-6 py-4 glass-panel border-b border-glass-border-light flex items-center justify-between"
    >
      {/* Brand logo */}
      <Link to="/" className="flex items-center space-x-2 select-none group">
        <div className="p-2 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform duration-300">
          <CheckSquare className="w-5 h-5" />
        </div>
        <span className="font-display text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
          Task Tracker <span className="text-violet-500">Pro</span>
        </span>
      </Link>

      {/* Navigation links */}
      <div className="hidden md:flex items-center space-x-1">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2 text-slate-300 dark:text-slate-300 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900"
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-white/5 dark:bg-white/5 light:bg-slate-900/5 rounded-lg -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Utilities */}
      <div className="flex items-center space-x-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-900/5 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-900/10 border border-glass-border-light text-slate-300 dark:text-slate-300 light:text-slate-600 cursor-pointer transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User avatar and logout */}
        <div className="flex items-center space-x-3 border-l border-glass-border-light pl-4">
          <Link to="/profile" className="flex items-center space-x-2 group">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-violet-500/30 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold font-display shadow-md shadow-violet-500/10">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden sm:inline text-sm font-medium text-slate-300 dark:text-slate-300 light:text-slate-700 group-hover:text-white dark:group-hover:text-white light:group-hover:text-slate-900 transition-colors duration-200">
              {user.name}
            </span>
          </Link>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 cursor-pointer transition-all duration-200"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
