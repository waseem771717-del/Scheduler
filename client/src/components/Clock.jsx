import React, { useState, useEffect } from 'react';

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 select-none">
      <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-white dark:text-white light:text-slate-900 clock-glow transition-all duration-300">
        {formatTime(time)}
      </h1>
      <p className="mt-2 text-sm md:text-base font-medium text-slate-400 dark:text-slate-400 light:text-slate-600 tracking-wide font-sans uppercase">
        {formatDate(time)}
      </p>
    </div>
  );
};

export default Clock;
