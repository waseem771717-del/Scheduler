import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CalendarPage = () => {
  const { getAuthHeaders } = useAuth();
  
  // Active calendar date
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Historical day selected for inspection
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDayData, setSelectedDayData] = useState(null);
  
  // Calendar heat maps
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState('');

  // Fetch month calendar aggregates
  const fetchMonthReports = async () => {
    setLoadingCalendar(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Calculate start and end range of calendar view
    const startDate = new Date(year, month - 1, 20).toISOString(); // padding dates
    const endDate = new Date(year, month + 1, 10).toISOString();
    
    try {
      const res = await fetch(`/api/reports/calendar?start=${startDate}&end=${endDate}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setMonthlyReports(data.reports);
      }
    } catch (err) {
      console.error('Error fetching calendar reports:', err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Fetch selected day task details
  const fetchDayDetails = async () => {
    setLoadingDay(true);
    try {
      const res = await fetch(`/api/reports/history/${selectedDateStr}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDayData(data);
      }
    } catch (err) {
      console.error('Error fetching day details:', err);
    } finally {
      setLoadingDay(false);
    }
  };

  useEffect(() => {
    fetchMonthReports();
  }, [currentDate]);

  useEffect(() => {
    fetchDayDetails();
  }, [selectedDateStr]);

  // Calendar rendering helpers
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysCount = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Pad previous month days
    const prevMonthDaysCount = new Date(year, month, 0).getDate();
    const padCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align to Monday first
    for (let i = padCount - 1; i >= 0; i--) {
      days.push({
        dayNum: prevMonthDaysCount - i,
        dateStr: new Date(year, month - 1, prevMonthDaysCount - i).toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysCount; i++) {
      days.push({
        dayNum: i,
        dateStr: new Date(year, month, i + 1).toISOString().split('T')[0], // timezone safe pad
        isCurrentMonth: true
      });
    }
    
    return days;
  };

  const days = getDaysInMonth();

  // Find report matching date
  const getReportForDate = (dateStr) => {
    return monthlyReports.find((r) => {
      const reportDateStr = new Date(r.date).toISOString().split('T')[0];
      return reportDateStr === dateStr;
    });
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatMonthName = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatTime12h = (time24) => {
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutesStr} ${ampm}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 min-h-screen relative">
      <div className="bg-glow-blue top-10 left-10" />

      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-glass-border-light pb-6">
        <Link to="/" className="p-2.5 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-950/5 border border-glass-border-light text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Historical Archive</span>
          <h1 className="font-display text-2xl font-bold text-white dark:text-white light:text-slate-900 flex items-center space-x-2">
            <CalendarDays className="w-5 h-5 text-blue-400" />
            <span>Calendar & History Logs</span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Visual Calendar Heatmap (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white dark:text-white light:text-slate-950">
              {formatMonthName()}
            </h3>
            <div className="flex items-center space-x-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer border border-glass-border-light">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer border border-glass-border-light">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            {/* Week headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase font-mono">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, idx) => {
                const report = getReportForDate(day.dateStr);
                const isSelected = selectedDateStr === day.dateStr;
                
                // Color coding based on success rate
                let tileColor = 'bg-white/3 dark:bg-white/3 light:bg-slate-900/3 border border-white/5';
                let textColor = day.isCurrentMonth 
                  ? 'text-slate-200 dark:text-slate-200 light:text-slate-800' 
                  : 'text-slate-600 dark:text-slate-600 light:text-slate-400';
                
                if (report) {
                  if (report.completionRate >= 80) {
                    tileColor = 'bg-emerald-500/20 border border-emerald-500/40';
                    if (day.isCurrentMonth) textColor = 'text-emerald-400 font-bold';
                  } else if (report.completionRate >= 50) {
                    tileColor = 'bg-amber-500/15 border border-amber-500/35';
                    if (day.isCurrentMonth) textColor = 'text-amber-400 font-bold';
                  } else {
                    tileColor = 'bg-red-500/15 border border-red-500/35';
                    if (day.isCurrentMonth) textColor = 'text-red-400 font-bold';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    className={`h-14 rounded-xl flex flex-col items-center justify-between p-1.5 cursor-pointer relative hover:scale-105 active:scale-95 transition-all ${tileColor} ${
                      isSelected ? 'ring-2 ring-violet-500 scale-105 z-10' : ''
                    }`}
                  >
                    <span className={`text-xs ${textColor}`}>{day.dayNum}</span>
                    {report && (
                      <span className="text-[9px] font-mono font-semibold text-slate-400 select-none">
                        {report.completionRate}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color legends */}
          <div className="flex items-center justify-center space-x-6 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-t border-glass-border-light pt-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span>&gt;= 80% Success</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/15 border border-amber-500/35" />
              <span>&gt;= 50% Success</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-red-500/15 border border-red-500/35" />
              <span>&lt; 50% Success</span>
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Retroactive Inspector Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {loadingDay ? (
              <div className="glass-panel p-6 rounded-3xl h-[450px] flex items-center justify-center animate-pulse">
                <span className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : selectedDayData ? (
              <motion.div
                key={selectedDateStr}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="glass-panel p-6 rounded-3xl space-y-6 min-h-[450px]"
              >
                {/* Header */}
                <div className="text-center border-b border-glass-border-light pb-4">
                  <h3 className="font-display text-lg font-bold text-slate-300 dark:text-slate-300 light:text-slate-800">
                    Day Report
                  </h3>
                  <p className="text-2xl font-display font-extrabold text-violet-400 tracking-tight mt-1">
                    {new Date(selectedDayData.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Day stats */}
                {selectedDayData.report ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white/3 border border-white/5 p-3 rounded-xl">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block">Success</span>
                        <span className="text-lg font-bold text-violet-400">{selectedDayData.report.completionRate}%</span>
                      </div>
                      <div className="bg-white/3 border border-white/5 p-3 rounded-xl">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block">Done</span>
                        <span className="text-lg font-bold text-emerald-400">{selectedDayData.report.completedCount}</span>
                      </div>
                      <div className="bg-white/3 border border-white/5 p-3 rounded-xl">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide block">Missed</span>
                        <span className="text-lg font-bold text-red-400">{selectedDayData.report.missedCount}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl text-center">
                      <p className="text-xs font-medium italic text-slate-300">
                        "{selectedDayData.report.summaryMessage}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/3 border border-white/5 rounded-xl text-center text-slate-400 text-xs">
                    No official report generated. Either no tasks existed, or tasks are still pending.
                  </div>
                )}

                {/* Historical Tasks checklist list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Tasks List ({selectedDayData.tasks?.length ?? 0})</h4>
                  
                  <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                    {selectedDayData.tasks?.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs italic">
                        No tasks scheduled on this day.
                      </div>
                    ) : (
                      selectedDayData.tasks.map((task) => {
                        const isCompleted = task.status === 'completed';
                        
                        return (
                          <div
                            key={task._id}
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                              isCompleted
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                : 'bg-white/3 border border-white/5 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              {isCompleted ? (
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                              ) : (
                                <HelpCircle className="w-5 h-5 flex-shrink-0 text-slate-500" />
                              )}
                              <span className="font-semibold text-xs truncate">{task.name}</span>
                            </div>
                            <span className="text-[10px] font-mono flex-shrink-0 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime12h(task.startTime)} - {formatTime12h(task.endTime)}</span>
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
