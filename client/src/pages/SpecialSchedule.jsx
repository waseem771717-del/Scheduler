import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimeMonitor } from '../hooks/useTimeMonitor';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  Trash2,
  Save,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Trophy,
  ArrowLeft,
  GripVertical,
  Copy,
  Edit2
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

const SpecialSchedule = () => {
  const { getAuthHeaders, user } = useAuth();
  
  // Date selection state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // View states: 'view' = display schedule, 'edit' = create/edit form
  const [mode, setMode] = useState('view');
  
  // Form states
  const [scheduleName, setScheduleName] = useState('');
  const [formTasks, setFormTasks] = useState([{ name: '', startTime: '09:00', endTime: '10:00' }]);
  
  // Load states
  const [schedule, setSchedule] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // End of Day Modal status
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Autosave Ref for draft
  const formRef = useRef({ name: scheduleName, tasks: formTasks });

  // 1. Autosave local draft logic
  useEffect(() => {
    formRef.current = { name: scheduleName, tasks: formTasks };
    // Keep draft saved locally
    localStorage.setItem(`special_draft_${selectedDate}`, JSON.stringify(formRef.current));
  }, [scheduleName, formTasks, selectedDate]);

  // Load schedule for date
  const loadSchedule = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/schedules/special?date=${selectedDate}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        if (data.schedule) {
          setSchedule(data.schedule);
          setTasks(data.tasks);
          setReport(data.report);
          setMode('view');
          
          // Trigger summary modal if all evaluated and no pending
          const pending = data.tasks.filter(t => t.status === 'pending');
          if (data.tasks.length > 0 && pending.length === 0 && data.report) {
            setShowSummaryModal(true);
          } else {
            setShowSummaryModal(false);
          }
        } else {
          // No schedule. Look for local draft
          setSchedule(null);
          setTasks([]);
          setReport(null);
          const savedDraft = localStorage.getItem(`special_draft_${selectedDate}`);
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            setScheduleName(parsed.name || '');
            setFormTasks(parsed.tasks || [{ name: '', startTime: '09:00', endTime: '10:00' }]);
          } else {
            setScheduleName('');
            setFormTasks([{ name: '', startTime: '09:00', endTime: '10:00' }]);
          }
          setMode('edit');
        }
      } else {
        setError(data.message || 'Error loading schedule');
      }
    } catch (err) {
      setError('Connection failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [selectedDate]);

  // Hook to monitor tasks and auto refresh when a deadline passes
  useTimeMonitor(tasks, loadSchedule);

  // Form task management
  const addTaskField = () => {
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

  const removeTaskField = (index) => {
    const updated = formTasks.filter((_, idx) => idx !== index);
    setFormTasks(updated.length > 0 ? updated : [{ name: '', startTime: '09:00', endTime: '10:00' }]);
  };

  const updateTaskField = (index, field, value) => {
    const updated = formTasks.map((t, idx) => {
      if (idx === index) {
        return { ...t, [field]: value };
      }
      return t;
    });
    setFormTasks(updated);
  };

  // Save schedule
  const handleSaveSchedule = async (tasksToSave = null) => {
    setSaving(true);
    setError('');
    
    const activeTasks = tasksToSave || formTasks;
    const name = tasksToSave ? (schedule?.name || scheduleName) : scheduleName;

    if (!name.trim()) {
      setError('Schedule name is required');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/schedules/special', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          date: selectedDate,
          tasks: activeTasks.filter(t => t.name.trim() !== '')
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSchedule(data.schedule);
        setTasks(data.tasks);
        setReport(null);
        setMode('view');
        // Clear local draft since it is saved
        localStorage.removeItem(`special_draft_${selectedDate}`);
        loadSchedule(); // Refresh statuses
      } else {
        setError(data.message || 'Failed to save schedule');
      }
    } catch (err) {
      setError('Connection failed. Please check backend.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle checklist checkbox
  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/schedules/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local tasks
        setTasks(tasks.map(t => (t._id === taskId ? data.task : t)));
        setReport(data.report);
        
        // Show summary modal if day complete
        if (data.report) {
          setShowSummaryModal(true);
        }
      } else {
        alert(data.message || 'Cannot edit this task status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDrop = async (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...tasks];
    const [draggedTask] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedTask);
    
    const updated = reordered.map((t, idx) => ({ ...t, order: idx }));
    setTasks(updated);
    setDraggedIndex(null);

    // Save reordered list back to server
    await handleSaveSchedule(updated);
  };

  // Switch to editing mode
  const handleEnterEditMode = () => {
    setScheduleName(schedule?.name || '');
    setFormTasks(tasks.map(t => ({ name: t.name, startTime: t.startTime, endTime: t.endTime })));
    setMode('edit');
  };

  // Date Nav Helpers
  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Formatter helpers
  const formatTime12h = (time24) => {
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutesStr} ${ampm}`;
  };

  const formatDateDisplay = (dateStr) => {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return { dayName, fullDate: `${dayNum} ${month} ${year}` };
  };

  const { dayName, fullDate } = formatDateDisplay(selectedDate);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 relative min-h-screen">
      <div className="bg-glow-purple top-10 left-10" />

      {/* Date Header Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-glass-border-light pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2.5 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-950/5 border border-glass-border-light text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Special Schedule Planner</span>
            <h1 className="font-display text-2xl font-bold text-white dark:text-white light:text-slate-900 flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-violet-400" />
              <span>Configure Special Day</span>
            </h1>
          </div>
        </div>

        {/* Date Toggler */}
        <div className="flex items-center space-x-2 glass-panel p-1 rounded-xl">
          <button onClick={() => changeDate(-1)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 text-slate-300 dark:text-slate-300 light:text-slate-700 cursor-pointer">
            Prev
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-0 text-sm font-semibold text-white dark:text-white light:text-slate-900 outline-none px-3 cursor-pointer"
          />
          <button onClick={() => changeDate(1)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 text-slate-300 dark:text-slate-300 light:text-slate-700 cursor-pointer">
            Next
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start space-x-2 max-w-2xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
          <div className="h-96 bg-white/5 rounded-3xl border border-glass-border-light" />
          <div className="h-96 bg-white/5 rounded-3xl border border-glass-border-light" />
        </div>
      ) : mode === 'edit' ? (
        /* ==================== CREATE/EDIT VIEW ==================== */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto glass-panel p-8 rounded-3xl space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white dark:text-white light:text-slate-900">
              {schedule ? 'Modify Schedule' : 'New Special Day Plan'}
            </h2>
            <span className="text-xs text-slate-400 font-mono">Autosave is active</span>
          </div>

          <div className="space-y-4">
            {/* Schedule Name */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Schedule Title</label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g., Exam Prep, Weekend Routine, Workout Intensive"
                className="glass-input text-base"
              />
            </div>

            {/* Task list array */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Tasks Sequence</label>
              
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {formTasks.map((task, idx) => (
                  <div key={idx} className="flex items-center space-x-3 bg-white/3 p-4 rounded-2xl border border-white/5">
                    <span className="text-sm font-semibold text-slate-500 font-mono w-6">{idx + 1}</span>
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => updateTaskField(idx, 'name', e.target.value)}
                      placeholder="Task Description (e.g., Mathematics study)"
                      className="flex-grow glass-input text-sm py-2 px-3"
                    />
                    {/* Start Time 12h Selects */}
                    <div className="flex items-center space-x-1 bg-white/5 dark:bg-white/5 light:bg-slate-900/5 border border-glass-border-light p-1 rounded-xl">
                      <select
                        value={parse24hTo12h(task.startTime).hour}
                        onChange={(e) => {
                          const { minute, ampm } = parse24hTo12h(task.startTime);
                          updateTaskField(idx, 'startTime', convert12hTo24h(e.target.value, minute, ampm));
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
                          updateTaskField(idx, 'startTime', convert12hTo24h(hour, e.target.value, ampm));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {minutesList.map(m => <option key={m} value={m} className="text-slate-800 dark:text-slate-200">{m}</option>)}
                      </select>
                      <select
                        value={parse24hTo12h(task.startTime).ampm}
                        onChange={(e) => {
                          const { hour, minute } = parse24hTo12h(task.startTime);
                          updateTaskField(idx, 'startTime', convert12hTo24h(hour, minute, e.target.value));
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
                          updateTaskField(idx, 'endTime', convert12hTo24h(e.target.value, minute, ampm));
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
                          updateTaskField(idx, 'endTime', convert12hTo24h(hour, e.target.value, ampm));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {minutesList.map(m => <option key={m} value={m} className="text-slate-800 dark:text-slate-200">{m}</option>)}
                      </select>
                      <select
                        value={parse24hTo12h(task.endTime).ampm}
                        onChange={(e) => {
                          const { hour, minute } = parse24hTo12h(task.endTime);
                          updateTaskField(idx, 'endTime', convert12hTo24h(hour, minute, e.target.value));
                        }}
                        className="bg-transparent text-xs font-semibold text-white dark:text-white light:text-slate-900 outline-none cursor-pointer p-1 font-mono"
                      >
                        {ampmList.map(ap => <option key={ap} value={ap} className="text-slate-800 dark:text-slate-200">{ap}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTaskField(idx)}
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
                  onClick={addTaskField}
                  className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-glass-border-light text-white rounded-xl text-sm font-medium flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task</span>
                </button>

                <div className="flex space-x-3">
                  {schedule && (
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
                    onClick={() => handleSaveSchedule(null)}
                    disabled={saving}
                    className="py-2.5 px-6 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium flex items-center space-x-2 cursor-pointer shadow-lg shadow-violet-500/20 disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Schedule</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ==================== DISPLAY VIEW ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT PANEL: Task ordering list */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6 rounded-3xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">Flow List</span>
                <h2 className="font-display text-xl font-bold text-white dark:text-white light:text-slate-900">
                  {schedule.name}
                </h2>
              </div>
              <button
                onClick={handleEnterEditMode}
                className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-glass-border-light text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Layout</span>
              </button>
            </div>

            {/* Drag and Drop list container */}
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No tasks configured for this schedule.
                </div>
              ) : (
                tasks.map((task, idx) => {
                  let statusClass = 'state-pending';
                  if (task.status === 'completed') statusClass = 'state-completed';
                  
                  return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(idx)}
                      className={`flex items-center justify-between p-4 rounded-2xl border ${statusClass} cursor-grab active:cursor-grabbing hover:translate-x-1 transition-all duration-200 select-none`}
                    >
                      <div className="flex items-center space-x-3">
                        <GripVertical className="w-4 h-4 text-slate-500 flex-shrink-0 cursor-grab" />
                        <div>
                          <p className="font-semibold text-sm line-clamp-1">{task.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {formatTime12h(task.startTime)} - {formatTime12h(task.endTime)}
                          </p>
                        </div>
                      </div>
                      
                      {/* State Pills */}
                      <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-current">
                        {task.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* RIGHT PANEL: Checklist Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6 rounded-3xl space-y-6"
          >
            {/* Right Panel Top: Day Details */}
            <div className="text-center border-b border-glass-border-light pb-4">
              <h3 className="font-display text-2xl font-extrabold text-violet-400 tracking-tight">
                {dayName}
              </h3>
              <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-mono">
                {fullDate}
              </p>
            </div>

            {/* Checklist elements */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Tasks checklist</h4>
              
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  
                  return (
                    <div
                      key={task._id}
                      className={`flex items-center justify-between p-4 rounded-2xl border ${
                        isCompleted
                          ? 'bg-emerald-500/5 border-emerald-500/25'
                          : 'bg-white/3 border border-white/5'
                      } transition-all duration-300`}
                    >
                      <div className="flex items-center space-x-4">
                        {/* Custom Checkbox Action */}
                        <button
                          onClick={() => handleToggleTask(task._id, task.status)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border cursor-pointer transition-all duration-200 ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-transparent border-slate-500 hover:border-violet-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : null}
                        </button>

                        <div className="flex flex-col">
                          <span
                            className={`font-semibold text-sm ${
                              isCompleted
                                ? 'text-emerald-400 line-through'
                                : 'text-white dark:text-white light:text-slate-800'
                            }`}
                          >
                            {task.name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatTime12h(task.startTime)} - {formatTime12h(task.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ==================== END OF DAY SUMMARY POPUP ==================== */}
      <AnimatePresence>
        {showSummaryModal && report && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md glass-panel p-8 rounded-3xl text-center space-y-6 relative border border-violet-500/30"
            >
              <div className="mx-auto w-16 h-16 bg-violet-600/10 border border-violet-500/30 rounded-2xl flex items-center justify-center text-violet-400 mb-4 animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold text-white dark:text-white light:text-slate-900">
                  Today's Progress
                </h3>
                <p className="text-sm text-slate-400 font-medium">Here is your schedule execution breakdown</p>
              </div>

              {/* Progress SVG Ring */}
              <div className="relative w-28 h-28 mx-auto my-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" className="stroke-white/5 fill-none" strokeWidth="8" />
                  <circle
                    cx="56" cy="56" r="48"
                    className="stroke-violet-500 fill-none transition-all duration-1000"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - (report.completionRate ?? 0) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-display font-extrabold text-white">
                    {report.completionRate}%
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Done</span>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-4 bg-white/3 border border-white/5 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block tracking-wider">Completed Tasks</span>
                  <span className="text-xl font-bold text-emerald-400">{report.completedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block tracking-wider">Missed Tasks</span>
                  <span className="text-xl font-bold text-red-400">{report.missedCount}</span>
                </div>
              </div>

              {/* Motivational message */}
              <p className="text-sm font-medium italic text-slate-300 px-4">
                {report.summaryMessage}
              </p>

              <button
                onClick={() => setShowSummaryModal(false)}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all"
              >
                Continue to Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpecialSchedule;
