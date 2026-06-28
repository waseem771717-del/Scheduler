import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimeMonitor } from '../hooks/useTimeMonitor';
import { motion } from 'framer-motion';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import {
  CalendarRange,
  Plus,
  Trash2,
  Save,
  Check,
  X,
  AlertCircle,
  BarChart2,
  Edit2,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Register Chart.js elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1));
const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ampmList = ['AM', 'PM'];

const parse24hTo12h = (time24) => {
  if (!time24) return { hour: '12', minute: '00', ampm: 'AM' };
  const [hStr, mStr] = time24.split(':');
  const h24 = parseInt(hStr);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return {
    hour: String(h12),
    minute: mStr,
    ampm
  };
};

const convert12hTo24h = (hour, minute, ampm) => {
  let h = parseInt(hour);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const WeeklySchedule = () => {
  const { getAuthHeaders } = useAuth();
  
  // Target date within current week (defaults to today)
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date().toISOString().split('T')[0]);
  
  // View mode: 'view' = checklists & stats, 'edit' = template configuration form
  const [mode, setMode] = useState('view');
  
  // Form template configuration states
  const [scheduleName, setScheduleName] = useState('');
  
  // Flat routine tasks list
  const [formTasks, setFormTasks] = useState([{ name: '', startTime: '09:00', endTime: '10:00' }]);

  // API data
  const [schedule, setSchedule] = useState(null);
  const [instantiatedTasks, setInstantiatedTasks] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const baseDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const startDay = schedule?.startDayOfWeek || 'Monday';
  const startIdx = baseDays.indexOf(startDay);
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => baseDays[(startIdx + i) % 7]);

  // Autosave Ref for draft
  const draftRef = useRef({ name: scheduleName, tasks: formTasks });

  useEffect(() => {
    draftRef.current = { name: scheduleName, tasks: formTasks };
    localStorage.setItem('weekly_template_draft', JSON.stringify(draftRef.current));
  }, [scheduleName, formTasks]);

  // Load weekly routines
  const loadWeeklyData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError('');
    try {
      // 1. Fetch template schedule definition
      const tempRes = await fetch('/api/schedules/weekly', {
        headers: getAuthHeaders()
      });
      const tempData = await tempRes.json();
      
      if (tempData.success && tempData.schedule) {
        setSchedule(tempData.schedule);
        setScheduleName(tempData.schedule.name);
        
        // Filter to Monday template tasks representing the unique routine list
        const mappedTasks = tempData.tasks
          .filter(t => t.dayOfWeek === 'Monday')
          .sort((a, b) => a.order - b.order)
          .map(t => ({ name: t.name, startTime: t.startTime, endTime: t.endTime }));
        
        setFormTasks(mappedTasks.length > 0 ? mappedTasks : [{ name: '', startTime: '09:00', endTime: '10:00' }]);
      } else {
        // Look for local draft
        const savedDraft = localStorage.getItem('weekly_template_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          setScheduleName(parsed.name || '');
          setFormTasks(parsed.tasks || [{ name: '', startTime: '09:00', endTime: '10:00' }]);
        }
      }

      // 2. Fetch active week instances & reports
      const instRes = await fetch(`/api/schedules/weekly/instance?date=${currentWeekDate}`, {
        headers: getAuthHeaders()
      });
      const instData = await instRes.json();
      
      if (instData.success) {
        setInstantiatedTasks(instData.tasks);
        setWeeklyReport(instData.weeklyReport);
        
        if (!schedule && instData.schedule) {
          setSchedule(instData.schedule);
          setScheduleName(instData.schedule.name);
        }

        if (instData.tasks.length === 0 && !instData.schedule) {
          setMode('edit');
        } else {
          setMode('view');
        }
      }
    } catch (err) {
      setError('Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeeklyData();
  }, [currentWeekDate]);

  // Active monitoring
  useTimeMonitor(instantiatedTasks, loadWeeklyData);

  // Form task template helpers
  const addFormTask = () => {
    const lastTask = formTasks[formTasks.length - 1];
    let nextStart = '09:00';
    let nextEnd = '10:00';

    if (lastTask && lastTask.endTime) {
      nextStart = lastTask.endTime;
      const [h, m] = lastTask.endTime.split(':').map(Number);
      const endH = (h + 1) % 24;
      nextEnd = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    setFormTasks([...formTasks, { name: '', startTime: nextStart, endTime: nextEnd }]);
  };

  const removeFormTask = (idx) => {
    const updated = formTasks.filter((_, i) => i !== idx);
    setFormTasks(updated.length > 0 ? updated : [{ name: '', startTime: '09:00', endTime: '10:00' }]);
  };

  const updateFormTask = (idx, field, value) => {
    const updated = formTasks.map((t, i) => (i === idx ? { ...t, [field]: value } : t));
    setFormTasks(updated);
  };

  // Submit template
  const handleSaveTemplate = async () => {
    setSaving(true);
    setError('');

    if (!scheduleName.trim()) {
      setError('Schedule name is required');
      setSaving(false);
      return;
    }

    // Filter valid tasks
    const tasksArray = formTasks
      .filter(t => t.name.trim() !== '')
      .map(t => ({
        name: t.name.trim(),
        startTime: t.startTime,
        endTime: t.endTime
      }));

    try {
      const res = await fetch('/api/schedules/weekly', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: scheduleName.trim(),
          tasks: tasksArray
        })
      });
      const data = await res.json();
      if (data.success) {
        setSchedule(data.schedule);
        localStorage.removeItem('weekly_template_draft');
        setMode('view');
        loadWeeklyData(); // Re-trigger instantiation and fetch
      } else {
        setError(data.message || 'Failed to save template');
      }
    } catch (err) {
      setError('Connection error. Please check server.');
    } finally {
      setSaving(false);
    }
  };

  // Checkbox toggle
  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/schedules/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setInstantiatedTasks(instantiatedTasks.map(t => (t._id === taskId ? data.task : t)));
        // Re-load to update weekly report stats
        const reportRes = await fetch(`/api/schedules/weekly/instance?date=${currentWeekDate}`, {
          headers: getAuthHeaders()
        });
        const reportData = await reportRes.json();
        if (reportData.success) {
          setWeeklyReport(reportData.weeklyReport);
        }
      } else {
        alert(data.message || 'Cannot edit this task status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Check if a day is today and in the active week
  const isDayInteractable = (dayName) => {
    const today = new Date();
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    if (dayName !== todayName) return false;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const startDayName = schedule?.startDayOfWeek || 'Monday';

    const getStartOfWeekString = (dateStr) => {
      const date = new Date(dateStr);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetStartIdx = dayNames.indexOf(startDayName);
      const currentIdx = date.getDay();
      
      let diff = currentIdx - targetStartIdx;
      if (diff < 0) diff += 7;
      
      const start = new Date(date);
      start.setDate(date.getDate() - diff);
      return start.toISOString().split('T')[0];
    };

    const viewWeekStart = getStartOfWeekString(currentWeekDate);
    const currentWeekStart = getStartOfWeekString(today.toISOString().split('T')[0]);
    return viewWeekStart === currentWeekStart;
  };

  // Check if a day is in the future relative to today
  const isFutureDay = (dayName) => {
    const today = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const startDayName = schedule?.startDayOfWeek || 'Monday';

    const getStartOfWeekDate = (dateStr) => {
      const date = new Date(dateStr);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetStartIdx = dayNames.indexOf(startDayName);
      const currentIdx = date.getDay();
      
      let diff = currentIdx - targetStartIdx;
      if (diff < 0) diff += 7;
      
      const start = new Date(date);
      start.setDate(date.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const viewWeekStart = getStartOfWeekDate(currentWeekDate);
    const currentWeekStart = getStartOfWeekDate(today.toISOString().split('T')[0]);

    if (viewWeekStart > currentWeekStart) {
      return true;
    }
    if (viewWeekStart < currentWeekStart) {
      return false;
    }

    const baseDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startIdx = baseDays.indexOf(startDayName);
    const orderedDays = Array.from({ length: 7 }, (_, i) => baseDays[(startIdx + i) % 7]);
    
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const todayIdx = orderedDays.indexOf(todayName);
    const targetIdx = orderedDays.indexOf(dayName);

    return targetIdx > todayIdx;
  };

  const getFeedbackMessageAndColor = (rate, total) => {
    if (total === 0) {
      return {
        message: "No tasks scheduled for today. Tomorrow is a fresh start—let's make it count!",
        colorClass: "text-slate-400 border-slate-500/20 bg-slate-500/5",
        barColor: "text-slate-500"
      };
    }
    if (rate === 100) {
      return {
        message: "Excellent! 🎉 You completed all of today's tasks. Keep maintaining this consistency.",
        colorClass: "text-emerald-400 border-emerald-500/25 bg-emerald-500/5",
        barColor: "text-emerald-500"
      };
    }
    if (rate >= 80) {
      return {
        message: "Great work! You completed most of today's tasks. Just a little more effort tomorrow.",
        colorClass: "text-blue-400 border-blue-500/25 bg-blue-500/5",
        barColor: "text-blue-500"
      };
    }
    if (rate >= 60) {
      return {
        message: "Good progress! You are moving in the right direction, but there is still room for improvement.",
        colorClass: "text-orange-400 border-orange-500/25 bg-orange-500/5",
        barColor: "text-orange-500"
      };
    }
    if (rate >= 40) {
      return {
        message: "You completed some of your tasks today. Try to stay more consistent tomorrow.",
        colorClass: "text-orange-400 border-orange-500/25 bg-orange-500/5",
        barColor: "text-orange-500"
      };
    }
    if (rate > 0) {
      return {
        message: "Your productivity was low today. Start with small goals tomorrow and build momentum.",
        colorClass: "text-red-400 border-red-500/25 bg-red-500/5",
        barColor: "text-red-500"
      };
    }
    return {
      message: "No tasks were completed today. Tomorrow is a fresh start—let's make it count!",
      colorClass: "text-red-400 border-red-500/25 bg-red-500/5",
      barColor: "text-red-500"
    };
  };

  const getLocalDateStr = (dateInput) => {
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayLocalStr = getLocalDateStr(new Date());
  const todayTasks = instantiatedTasks.filter(t => getLocalDateStr(t.date) === todayLocalStr);
  const totalTasksToday = todayTasks.length;
  const completedTasksToday = todayTasks.filter(t => t.status === 'completed').length;
  const pendingTasksToday = totalTasksToday - completedTasksToday;
  const completionRateToday = totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0;
  const feedback = getFeedbackMessageAndColor(completionRateToday, totalTasksToday);

  // Date controls
  const changeWeek = (weeks) => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() + weeks * 7);
    setCurrentWeekDate(d.toISOString().split('T')[0]);
  };

  // Time formatters
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutesStr} ${ampm}`;
  };

  // Duplicate entire week schedule to next week
  const handleDuplicateWeek = async () => {
    const nextWeekDate = new Date(currentWeekDate);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const targetWeekStr = nextWeekDate.toISOString().split('T')[0];
    
    setSaving(true);
    try {
      const res = await fetch('/api/schedules/duplicate-week', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sourceWeekDate: currentWeekDate,
          targetWeekDate: targetWeekStr
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully duplicated this week's checklist to week of ${targetWeekStr}!`);
        setCurrentWeekDate(targetWeekStr);
      } else {
        alert(data.message || 'Duplication failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Render Charts configuration
  const barChartData = {
    labels: weeklyReport?.dailyBreakdown?.map(d => d.day) || daysOfWeek,
    datasets: [
      {
        label: 'Completion Rate %',
        data: weeklyReport?.dailyBreakdown?.map(d => d.percentage) || [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(139, 92, 246, 0.45)',
        borderColor: '#8b5cf6',
        borderWidth: 1.5,
        borderRadius: 8,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' }
      }
    },
    plugins: {
      legend: { display: false },
    }
  };

  const pieChartData = {
    labels: ['Completed', 'Missed'],
    datasets: [
      {
        data: [weeklyReport?.completedCount || 0, weeklyReport?.missedCount || 0],
        backgroundColor: ['rgba(16, 185, 129, 0.45)', 'rgba(239, 68, 68, 0.45)'],
        borderColor: ['#10b981', '#ef4444'],
        borderWidth: 1.5,
      }
    ]
  };

  // Deduplicate routine tasks for display list
  const uniqueRoutineTasks = formTasks;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 min-h-screen relative">
      <div className="bg-glow-purple bottom-10 left-10" />

      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-glass-border-light pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2.5 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-950/5 border border-glass-border-light text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Weekly Routine Planner</span>
            <h1 className="font-display text-2xl font-bold text-white dark:text-white light:text-slate-900 flex items-center space-x-2">
              <CalendarRange className="w-5 h-5 text-fuchsia-400" />
              <span>Configure Weekly Routine</span>
            </h1>
          </div>
        </div>

        {/* Week Switcher */}
        <div className="flex items-center space-x-2 glass-panel p-1 rounded-xl">
          <button onClick={() => changeWeek(-1)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 text-slate-300 dark:text-slate-300 light:text-slate-700 cursor-pointer">
            Prev Week
          </button>
          <span className="text-xs font-semibold text-white dark:text-white light:text-slate-950 px-3 uppercase tracking-wider font-mono">
            Active Week
          </span>
          <button onClick={() => changeWeek(1)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 text-slate-300 dark:text-slate-300 light:text-slate-700 cursor-pointer">
            Next Week
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
          <div className="h-96 bg-white/5 rounded-3xl border border-glass-border-light" />
          <div className="h-96 bg-white/5 rounded-3xl border border-glass-border-light col-span-2" />
        </div>
      ) : mode === 'edit' ? (
        /* ==================== CREATE/EDIT WEEKLY ROUTINE ==================== */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto glass-panel p-8 rounded-3xl space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white dark:text-white light:text-slate-900">
              Configure Weekly Routine Template
            </h2>
            <span className="text-xs text-slate-400 font-mono">Draft saved</span>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Routine Name</label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g., Workweek Schedule, Summer Routine"
                className="glass-input text-base"
              />
            </div>

            {/* Flat checklist configuration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Routine Tasks ({formTasks.length})
                </span>
              </div>

              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                {formTasks.map((task, idx) => (
                  <div key={idx} className="flex items-center space-x-3 bg-white/3 p-4 rounded-2xl border border-white/5">
                    <span className="text-sm font-semibold text-slate-500 font-mono w-6">{idx + 1}</span>
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => updateFormTask(idx, 'name', e.target.value)}
                      placeholder="Task details (e.g., Gym Workout)"
                      className="flex-grow glass-input text-sm py-2 px-3"
                    />

                    {/* Start Time 12h Selects */}
                    <div className="flex items-center space-x-1 bg-white/5 dark:bg-white/5 light:bg-slate-900/5 border border-glass-border-light p-1 rounded-xl">
                      <select
                        value={parse24hTo12h(task.startTime).hour}
                        onChange={(e) => {
                          const { minute, ampm } = parse24hTo12h(task.startTime);
                          updateFormTask(idx, 'startTime', convert12hTo24h(e.target.value, minute, ampm));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {hoursList.map(h => <option key={h} value={h} className="text-slate-800 dark:text-slate-200">{h}</option>)}
                      </select>
                      <span className="text-slate-400 text-xs">:</span>
                      <select
                        value={parse24hTo12h(task.startTime).minute}
                        onChange={(e) => {
                          const { hour, ampm } = parse24hTo12h(task.startTime);
                          updateFormTask(idx, 'startTime', convert12hTo24h(hour, e.target.value, ampm));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {minutesList.map(m => <option key={m} value={m} className="text-slate-800 dark:text-slate-200">{m}</option>)}
                      </select>
                      <select
                        value={parse24hTo12h(task.startTime).ampm}
                        onChange={(e) => {
                          const { hour, minute } = parse24hTo12h(task.startTime);
                          updateFormTask(idx, 'startTime', convert12hTo24h(hour, minute, e.target.value));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {ampmList.map(ap => <option key={ap} value={ap} className="text-slate-800 dark:text-slate-200">{ap}</option>)}
                      </select>
                    </div>

                    <span className="text-slate-500 text-xs">to</span>

                    {/* End Time 12h Selects */}
                    <div className="flex items-center space-x-1 bg-white/5 dark:bg-white/5 light:bg-slate-900/5 border border-glass-border-light p-1 rounded-xl">
                      <select
                        value={parse24hTo12h(task.endTime).hour}
                        onChange={(e) => {
                          const { minute, ampm } = parse24hTo12h(task.endTime);
                          updateFormTask(idx, 'endTime', convert12hTo24h(e.target.value, minute, ampm));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {hoursList.map(h => <option key={h} value={h} className="text-slate-800 dark:text-slate-200">{h}</option>)}
                      </select>
                      <span className="text-slate-400 text-xs">:</span>
                      <select
                        value={parse24hTo12h(task.endTime).minute}
                        onChange={(e) => {
                          const { hour, ampm } = parse24hTo12h(task.endTime);
                          updateFormTask(idx, 'endTime', convert12hTo24h(hour, e.target.value, ampm));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {minutesList.map(m => <option key={m} value={m} className="text-slate-800 dark:text-slate-200">{m}</option>)}
                      </select>
                      <select
                        value={parse24hTo12h(task.endTime).ampm}
                        onChange={(e) => {
                          const { hour, minute } = parse24hTo12h(task.endTime);
                          updateFormTask(idx, 'endTime', convert12hTo24h(hour, minute, e.target.value));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {ampmList.map(ap => <option key={ap} value={ap} className="text-slate-800 dark:text-slate-200">{ap}</option>)}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFormTask(idx)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={addFormTask}
                  className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-glass-border-light text-white rounded-xl text-sm font-medium flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Routine Task</span>
                </button>

                <div className="flex space-x-3">
                  {instantiatedTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      className="py-2.5 px-5 bg-white/5 hover:bg-white/10 border border-glass-border-light text-slate-300 rounded-xl text-sm font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={saving}
                    className="py-2.5 px-6 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-sm font-medium flex items-center space-x-2 cursor-pointer shadow-lg shadow-fuchsia-500/20 disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Template</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ==================== WEEKLY DASHBOARD VIEW ==================== */
        <div className="space-y-12">
          
          {/* Main Layout Grid - LHS & RHS */}
          <div className="grid grid-cols-1 gap-8 items-start">
            
            {/* LHS/RHS REDESIGNED MATRIX GRID PANEL */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 rounded-3xl space-y-6 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-glass-border-light pb-4 gap-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">Routine Overview</span>
                  <h2 className="font-display text-xl font-bold text-white dark:text-white light:text-slate-900">
                    {schedule?.name || 'Routine Checklist'}
                  </h2>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleDuplicateWeek}
                    className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-glass-border-light text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Duplicate to Next Week
                  </button>
                  <button
                    onClick={() => setMode('edit')}
                    className="py-2 px-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-fuchsia-500/10"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Routine</span>
                  </button>
                </div>
              </div>

              {/* Redesigned Matrix Layout: LHS fixed descriptions & RHS daily columns */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-glass-border-light text-xs uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-4 px-6 font-semibold min-w-[220px]">Routine Tasks (LHS)</th>
                      {daysOfWeek.map(day => (
                        <th key={day} className="py-4 px-2 text-center font-semibold w-24">{day.slice(0, 3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueRoutineTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500 text-sm">
                          No tasks configured. Click "Edit Routine" to add tasks.
                        </td>
                      </tr>
                    ) : (
                      uniqueRoutineTasks.map((routineTask, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/1">
                          {/* LHS: Task Name & Time */}
                          <td className="py-4 px-6">
                            <span className="font-semibold text-sm text-white dark:text-white light:text-slate-800 block">
                              {routineTask.name}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-mono mt-0.5">
                              {formatTime12h(routineTask.startTime)} – {formatTime12h(routineTask.endTime)}
                            </span>
                          </td>
                          
                          {/* RHS: Checkboxes for Monday to Sunday */}
                          {daysOfWeek.map(day => {
                            // Find the instantiated task matching this row name, startTime, and target day
                            const task = instantiatedTasks.find(
                              t => t.name === routineTask.name &&
                              t.startTime === routineTask.startTime &&
                              t.dayOfWeek === day
                            );

                            if (!task) {
                              return (
                                <td key={day} className="py-4 px-2 text-center">
                                  <span className="text-xs text-slate-600 font-mono">-</span>
                                </td>
                              );
                            }                            const isCompleted = task.status === 'completed';
 
                            return (
                              <td key={day} className="py-4 px-2 text-center">
                                <button
                                  onClick={() => isDayInteractable(day) && handleToggleTask(task._id, task.status)}
                                  disabled={!isDayInteractable(day)}
                                  className={`w-6 h-6 mx-auto rounded-lg flex items-center justify-center border transition-all duration-200 ${
                                    isCompleted
                                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                      : !isDayInteractable(day)
                                      ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                                      : 'bg-transparent border-slate-500 hover:border-fuchsia-400 cursor-pointer'
                                  }`}
                                  title={`${day} - ${task.name} (${task.status === 'completed' ? 'Completed' : 'Not Completed'})${!isDayInteractable(day) ? ' (Locked)' : ''}`}
                                >
                                  {isCompleted ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  ) : isFutureDay(day) ? (
                                    <span className="text-[10px]">🔒</span>
                                  ) : null}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* Bottom stats breakdown (Chart.js) */}
          {weeklyReport && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-8 rounded-3xl space-y-8"
            >
              <div className="flex items-center space-x-2 border-b border-glass-border-light pb-4">
                <BarChart2 className="w-5 h-5 text-fuchsia-400" />
                <h3 className="font-display text-lg font-bold text-white dark:text-white light:text-slate-900">
                  Weekly Performance Analytics
                </h3>
              </div>

              {/* Grid of Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="bg-white/3 border border-white/5 p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Weekly Success Rate</span>
                  <span className="text-2xl font-display font-extrabold text-violet-400">{weeklyReport.completionRate}%</span>
                </div>
                <div className="bg-white/3 border border-white/5 p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Average Rate</span>
                  <span className="text-2xl font-display font-extrabold text-white">{weeklyReport.averageCompletionRate}%</span>
                </div>
                <div className="bg-white/3 border border-white/5 p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Best Day</span>
                  <span className="text-sm font-bold text-emerald-400 block pt-1.5 truncate uppercase">{weeklyReport.bestDay || 'N/A'}</span>
                </div>
                <div className="bg-white/3 border border-white/5 p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Worst Day</span>
                  <span className="text-sm font-bold text-red-400 block pt-1.5 truncate uppercase">{weeklyReport.worstDay || 'N/A'}</span>
                </div>
                <div className="bg-white/3 border border-white/5 p-4 rounded-2xl text-center space-y-1 col-span-2 md:col-span-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Done / Missed</span>
                  <span className="text-sm font-bold text-slate-300 block pt-1.5 font-mono">
                    {weeklyReport.completedCount} ✔ / {weeklyReport.missedCount} ❌
                  </span>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Bar chart - 7 cols */}
                <div className="md:col-span-8 bg-white/1 p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Daily Breakdown (Success %)</h4>
                  <div className="h-64">
                    <Bar data={barChartData} options={barChartOptions} />
                  </div>
                </div>

                {/* Pie Chart - 4 cols */}
                <div className="md:col-span-4 bg-white/1 p-6 rounded-2xl border border-white/5 flex flex-col items-center">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 w-full text-left">Completed vs Missed Ratio</h4>
                  <div className="h-56 w-56 flex items-center justify-center">
                    <Pie data={pieChartData} />
                  </div>
                </div>
              </div>

              {/* Today's Analysis Section */}
              <div className="border-t border-glass-border-light pt-8 space-y-6">
                <div className="flex items-center space-x-2 pb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Today's Analysis
                  </span>
                </div>
                
                {totalTasksToday === 0 ? (
                  <div className="p-6 rounded-2xl bg-white/3 border border-white/5 text-center text-sm text-slate-400">
                    No tasks scheduled for today in this week's routine. (If you are viewing another week, switch to the active week to see today's analysis).
                  </div>
                ) : (
                  <div className={`p-6 rounded-3xl border ${feedback.colorClass} flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300`}>
                    <div className="space-y-4 flex-grow w-full md:w-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white/3 border border-white/5 p-3 rounded-2xl text-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Tasks</span>
                          <span className="text-xl font-bold text-white block mt-1">{totalTasksToday}</span>
                        </div>
                        <div className="bg-white/3 border border-white/5 p-3 rounded-2xl text-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Completed</span>
                          <span className="text-xl font-bold text-emerald-400 block mt-1">{completedTasksToday}</span>
                        </div>
                        <div className="bg-white/3 border border-white/5 p-3 rounded-2xl text-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Pending</span>
                          <span className="text-xl font-bold text-amber-400 block mt-1">{pendingTasksToday}</span>
                        </div>
                        <div className="bg-white/3 border border-white/5 p-3 rounded-2xl text-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Completion Rate</span>
                          <span className="text-xl font-bold text-violet-400 block mt-1">{completionRateToday}%</span>
                        </div>
                      </div>
                      
                      <div className="text-sm font-medium leading-relaxed">
                        Feedback: <span className="italic">"{feedback.message}"</span>
                      </div>
                    </div>

                    {/* Progress Circle */}
                    <div className="flex-shrink-0 flex items-center justify-center">
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="48" cy="48" r="40" className="stroke-white/5 fill-none" strokeWidth="6" />
                          <circle
                            cx="48" cy="48" r="40"
                            className={`${feedback.barColor} fill-none transition-all duration-500`}
                            strokeWidth="6"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionRateToday / 100)}`}
                            strokeLinecap="round"
                            style={{ stroke: 'currentColor' }}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white font-display">
                          {completionRateToday}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklySchedule;
