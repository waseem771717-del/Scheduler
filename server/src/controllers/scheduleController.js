import DaySchedule from '../models/DaySchedule.js';
import WeekSchedule from '../models/WeekSchedule.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import DailyReport from '../models/DailyReport.js';
import WeeklyReport from '../models/WeeklyReport.js';
import Notification from '../models/Notification.js';
import { scheduleTaskNotifications } from './notificationController.js';

// Convert local time in a timezone to a UTC Date
export const getUTCFromLocal = (dateInput, timeStr, timezone) => {
  const dateObj = new Date(dateInput);
  
  // Get YYYY-MM-DD in UTC
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  // Construct target local ISO time string guess
  const localStr = `${dateStr}T${timeStr}:00`;
  let utcTime = new Date(localStr + 'Z').getTime();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Adjust timezone difference
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(utcTime));
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    // Construct local formatted string
    const formattedLocalStr = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}`;
    
    const diff = new Date(formattedLocalStr + 'Z').getTime() - new Date(localStr + 'Z').getTime();
    if (diff === 0) break;
    utcTime -= diff;
  }
  
  return new Date(utcTime);
};

// Calculate start and end of week in user's timezone based on startDay
export const getStartAndEndOfWeek = (dateInput, timezone, startDay = 'Monday') => {
  const date = new Date(dateInput);
  
  // Format to user timezone to find local date parts
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
  
  // Construct a base UTC date at 12:00:00 to avoid midnight crossing bugs
  const localDate = new Date(`${partMap.year}-${partMap.month}-${partMap.day}T12:00:00Z`);
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetStartIdx = dayNames.indexOf(startDay);
  const currentIdx = localDate.getUTCDay();
  
  let diff = currentIdx - targetStartIdx;
  if (diff < 0) diff += 7;
  
  const startDate = new Date(localDate);
  startDate.setUTCDate(localDate.getUTCDate() - diff);
  
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);
  
  const startYear = startDate.getUTCFullYear();
  const startMonth = String(startDate.getUTCMonth() + 1).padStart(2, '0');
  const startDayVal = String(startDate.getUTCDate()).padStart(2, '0');
  const startDateStr = `${startYear}-${startMonth}-${startDayVal}`;

  const endYear = endDate.getUTCFullYear();
  const endMonth = String(endDate.getUTCMonth() + 1).padStart(2, '0');
  const endDayVal = String(endDate.getUTCDate()).padStart(2, '0');
  const endDateStr = `${endYear}-${endMonth}-${endDayVal}`;

  return {
    monUTC: getUTCFromLocal(startDateStr, '00:00', timezone),
    sunUTC: getUTCFromLocal(endDateStr, '23:59', timezone)
  };
};

// Check and generate Daily Report
export const checkAndGenerateDailyReport = async (userId, date, timezone, skipWeeklyReport = false) => {
  const startOfDay = getUTCFromLocal(date, '00:00', timezone);
  const endOfDay = getUTCFromLocal(date, '23:59', timezone);
  
  const tasks = await Task.find({
    userId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });
  
  if (tasks.length === 0) return null;
  
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const missedCount = tasks.filter(t => t.status !== 'completed').length; // Unchecked / not completed
  const totalTasks = tasks.length;
  const completionRate = Math.round((completedCount / totalTasks) * 100);
  
  let report = await DailyReport.findOne({ userId, date: startOfDay });
  
  let summaryMessage = '';
  if (completionRate >= 80) {
    summaryMessage = `Excellent! You completed ${completionRate}% of today's goals.`;
  } else if (completionRate >= 50) {
    summaryMessage = `Good job! You completed ${completionRate}% of today's goals. Let's do even better tomorrow.`;
  } else {
    summaryMessage = `You completed only ${completionRate}%. Let's improve tomorrow.`;
  }
  
  let streakCount = 0;
  if (!report) {
    // Find yesterday's report for streak
    const yesterday = new Date(startOfDay);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayReport = await DailyReport.findOne({ userId, date: yesterday });
    
    if (yesterdayReport && yesterdayReport.completionRate >= 50) {
      streakCount = yesterdayReport.streakCount + (completionRate >= 50 ? 1 : 0);
    } else {
      streakCount = completionRate >= 50 ? 1 : 0;
    }
  } else {
    streakCount = report.streakCount;
    if (report.completionRate < 50 && completionRate >= 50) {
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayReport = await DailyReport.findOne({ userId, date: yesterday });
      streakCount = (yesterdayReport ? yesterdayReport.streakCount : 0) + 1;
    } else if (completionRate < 50) {
      streakCount = 0;
    }
  }
  
  if (!report) {
    report = new DailyReport({
      userId,
      date: startOfDay,
      completedCount,
      missedCount,
      totalTasks,
      completionRate,
      summaryMessage,
      streakCount
    });
  } else {
    report.completedCount = completedCount;
    report.missedCount = missedCount;
    report.totalTasks = totalTasks;
    report.completionRate = completionRate;
    report.summaryMessage = summaryMessage;
    report.streakCount = streakCount;
  }
  
  await report.save();
  
  // Also trigger weekly report calculation
  if (!skipWeeklyReport) {
    const schedule = await WeekSchedule.findOne({ userId, isActive: true });
    const startDay = schedule?.startDayOfWeek || 'Monday';
    const { monUTC } = getStartAndEndOfWeek(startOfDay, timezone, startDay);
    await checkAndGenerateWeeklyReport(userId, monUTC, timezone);
  }
  
  return report;
};

// Check and generate Weekly Report
export const checkAndGenerateWeeklyReport = async (userId, startOfWeekDate, timezone) => {
  const schedule = await WeekSchedule.findOne({ userId, isActive: true });
  const startDay = schedule?.startDayOfWeek || 'Monday';

  const monUTC = getUTCFromLocal(startOfWeekDate, '00:00', timezone);
  const sunUTC = new Date(monUTC);
  sunUTC.setDate(monUTC.getDate() + 6);
  sunUTC.setHours(23, 59, 59, 999);
  
  const tasks = await Task.find({
    userId,
    date: { $gte: monUTC, $lte: sunUTC },
    isInstance: true
  });
  
  if (tasks.length === 0) return null;
  
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const missedCount = tasks.filter(t => t.status !== 'completed').length; // Unchecked / not completed
  const totalTasks = tasks.length;
  const completionRate = Math.round((completedCount / totalTasks) * 100);
  
  const baseDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const startIdx = baseDays.indexOf(startDay);
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => baseDays[(startIdx + i) % 7]);
  const dailyBreakdown = daysOfWeek.map(dayName => {
    const dayTasks = tasks.filter(t => {
      const localDate = new Date(t.date.toLocaleString('en-US', { timeZone: timezone }));
      const weekday = localDate.toLocaleDateString('en-US', { weekday: 'long' });
      return weekday === dayName;
    });
    
    if (dayTasks.length === 0) {
      return { day: dayName, percentage: 0, completed: 0, missed: 0 };
    }
    
    const dayCompleted = dayTasks.filter(t => t.status === 'completed').length;
    const dayMissed = dayTasks.filter(t => t.status !== 'completed').length; // Unchecked / not completed
    return {
      day: dayName,
      percentage: Math.round((dayCompleted / dayTasks.length) * 100),
      completed: dayCompleted,
      missed: dayMissed
    };
  });
  
  let bestDay = '';
  let worstDay = '';
  let maxPct = -1;
  let minPct = 101;
  
  const activeBreakdowns = dailyBreakdown.filter(d => d.completed + d.missed > 0);
  if (activeBreakdowns.length > 0) {
    activeBreakdowns.forEach(d => {
      if (d.percentage > maxPct) {
        maxPct = d.percentage;
        bestDay = d.day;
      }
      if (d.percentage < minPct) {
        minPct = d.percentage;
        worstDay = d.day;
      }
    });
  }
  
  const averageCompletionRate = activeBreakdowns.length > 0
    ? Math.round(activeBreakdowns.reduce((sum, d) => sum + d.percentage, 0) / activeBreakdowns.length)
    : 0;
  
  let weeklyReport = await WeeklyReport.findOne({ userId, startDate: monUTC });
  if (!weeklyReport) {
    weeklyReport = new WeeklyReport({
      userId,
      startDate: monUTC,
      endDate: sunUTC,
      completedCount,
      missedCount,
      totalTasks,
      completionRate,
      dailyBreakdown,
      bestDay,
      worstDay,
      averageCompletionRate
    });
  } else {
    weeklyReport.completedCount = completedCount;
    weeklyReport.missedCount = missedCount;
    weeklyReport.totalTasks = totalTasks;
    weeklyReport.completionRate = completionRate;
    weeklyReport.dailyBreakdown = dailyBreakdown;
    weeklyReport.bestDay = bestDay;
    weeklyReport.worstDay = worstDay;
    weeklyReport.averageCompletionRate = averageCompletionRate;
  }
  
  await weeklyReport.save();
  return weeklyReport;
};

// Evaluate pending tasks to missed (No-op - automatic missed checks disabled)
export const evaluateTasks = async (userId, tasks) => {
  return { tasks, updated: false };
};

// @desc    Create or update special day schedule
// @route   POST /api/schedules/special
// @access  Private
export const createOrUpdateSpecialDay = async (req, res) => {
  const { name, date, tasks } = req.body;
  const userId = req.user._id;
  const timezone = req.user.timezone || 'UTC';

  try {
    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Schedule name and date are required' });
    }

    const startOfTargetDay = getUTCFromLocal(date, '00:00', timezone);

    // Find or create special day schedule
    let schedule = await DaySchedule.findOne({ userId, date: startOfTargetDay });
    if (!schedule) {
      schedule = new DaySchedule({ userId, name, date: startOfTargetDay });
      await schedule.save();
    } else {
      schedule.name = name;
      await schedule.save();
    }

    // Clear old tasks for this schedule
    await Task.deleteMany({ userId, scheduleId: schedule._id, scheduleType: 'DaySchedule' });

    // Insert new tasks
    const newTasks = [];
    if (tasks && Array.isArray(tasks)) {
      for (let i = 0; i < tasks.length; i++) {
        const taskData = tasks[i];
        const t = new Task({
          userId,
          scheduleId: schedule._id,
          scheduleType: 'DaySchedule',
          name: taskData.name,
          startTime: taskData.startTime,
          endTime: taskData.endTime,
          date: startOfTargetDay,
          order: i
        });
        await t.save();
        await scheduleTaskNotifications(req.user, t);
        newTasks.push(t);
      }
    }

    // Recalculate daily report (it might reset report to pending if tasks were added/edited)
    await checkAndGenerateDailyReport(userId, startOfTargetDay, timezone);

    res.status(201).json({ success: true, schedule, tasks: newTasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get special day schedule and tasks by date
// @route   GET /api/schedules/special
// @access  Private
export const getSpecialDay = async (req, res) => {
  const { date } = req.query;
  const userId = req.user._id;
  const timezone = req.user.timezone || 'UTC';

  try {
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date query param is required' });
    }

    const startOfTargetDay = getUTCFromLocal(date, '00:00', timezone);

    const schedule = await DaySchedule.findOne({ userId, date: startOfTargetDay });
    if (!schedule) {
      return res.json({ success: true, schedule: null, tasks: [], report: null });
    }

    let tasks = await Task.find({ userId, scheduleId: schedule._id, scheduleType: 'DaySchedule' }).sort('order');
    
    // Evaluate tasks
    const evalResult = await evaluateTasks(userId, tasks);
    tasks = evalResult.tasks;

    // Check if daily report should be generated/updated
    const report = await checkAndGenerateDailyReport(userId, startOfTargetDay, timezone);

    res.json({ success: true, schedule, tasks, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or update weekly template tasks
// @route   POST /api/schedules/weekly
// @access  Private
export const createOrUpdateWeekly = async (req, res) => {
  const { name, tasks } = req.body; // tasks is flat array of { name, startTime, endTime }
  const userId = req.user._id;

  try {
    if (!name) {
      return res.status(400).json({ success: false, message: 'Weekly Schedule name is required' });
    }

    let schedule = await WeekSchedule.findOne({ userId, isActive: true });
    const timezone = req.user.timezone || 'UTC';
    const currentLocalStr = new Date().toLocaleString('en-US', { timeZone: timezone });
    const currentLocalDate = new Date(currentLocalStr);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[currentLocalDate.getDay()];

    if (!schedule) {
      schedule = new WeekSchedule({ userId, name, isActive: true, startDayOfWeek: currentDayName });
      await schedule.save();
    } else {
      schedule.name = name;
      if (!schedule.startDayOfWeek) {
        const createdAtLocalStr = (schedule.createdAt || new Date()).toLocaleString('en-US', { timeZone: timezone });
        const createdAtLocalDate = new Date(createdAtLocalStr);
        schedule.startDayOfWeek = dayNames[createdAtLocalDate.getDay()];
      }
      await schedule.save();
    }

    // Delete existing template tasks (isInstance = false)
    await Task.deleteMany({ userId, scheduleId: schedule._id, scheduleType: 'WeekSchedule', isInstance: false });

    // Save template tasks replicated for all 7 days!
    const savedTasks = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    if (tasks && Array.isArray(tasks)) {
      for (let i = 0; i < tasks.length; i++) {
        const taskData = tasks[i];
        for (const day of days) {
          const t = new Task({
            userId,
            scheduleId: schedule._id,
            scheduleType: 'WeekSchedule',
            name: taskData.name,
            startTime: taskData.startTime,
            endTime: taskData.endTime,
            dayOfWeek: day,
            isInstance: false,
            order: i
          });
          await t.save();
          savedTasks.push(t);
        }
      }
    }

    res.status(201).json({ success: true, schedule, tasks: savedTasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get weekly schedule template
// @route   GET /api/schedules/weekly
// @access  Private
export const getWeeklyTemplate = async (req, res) => {
  const userId = req.user._id;

  try {
    const schedule = await WeekSchedule.findOne({ userId, isActive: true });
    if (!schedule) {
      return res.json({ success: true, schedule: null, tasks: [] });
    }

    // Filter to Monday to return a clean single list of routine tasks
    const tasks = await Task.find({
      userId,
      scheduleId: schedule._id,
      scheduleType: 'WeekSchedule',
      isInstance: false,
      dayOfWeek: 'Monday'
    }).sort('order');
    
    res.json({ success: true, schedule, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get weekly instantiated schedule and daily reports
// @route   GET /api/schedules/weekly/instance
// @access  Private
export const getWeeklyInstance = async (req, res) => {
  const { date } = req.query; // date within the target week
  const userId = req.user._id;
  const timezone = req.user.timezone || 'UTC';

  try {
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const schedule = await WeekSchedule.findOne({ userId, isActive: true });
    const startDay = schedule?.startDayOfWeek || 'Monday';

    const { monUTC, sunUTC } = getStartAndEndOfWeek(date, timezone, startDay);

    // 1. Get instantiated tasks for this week
    let tasks = await Task.find({
      userId,
      scheduleType: 'WeekSchedule',
      isInstance: true,
      date: { $gte: monUTC, $lte: sunUTC }
    }).sort('order');

    // 2. Ensure all template tasks are instantiated for the week
    if (schedule) {
      const templates = await Task.find({
        userId,
        scheduleId: schedule._id,
        scheduleType: 'WeekSchedule',
        isInstance: false
      });

      if (templates.length > 0) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const startIdx = days.indexOf(startDay);
        const orderedDays = Array.from({ length: 7 }, (_, i) => days[(startIdx + i) % 7]);
        const userObj = await User.findById(userId);
        let instantiatedAny = false;

        for (const template of templates) {
          const dayIndexInOrdered = orderedDays.indexOf(template.dayOfWeek);
          if (dayIndexInOrdered !== -1) {
            // Find target date for this day of the week
            const targetDate = new Date(monUTC);
            targetDate.setUTCDate(monUTC.getUTCDate() + dayIndexInOrdered);
            
            // Check if this task is already instantiated for this date
            const existing = tasks.find(
              t => t.name === template.name &&
              t.startTime === template.startTime &&
              t.endTime === template.endTime &&
              t.dayOfWeek === template.dayOfWeek &&
              t.date.getTime() === targetDate.getTime()
            );

            if (!existing) {
              const t = new Task({
                userId,
                scheduleId: schedule._id,
                scheduleType: 'WeekSchedule',
                name: template.name,
                startTime: template.startTime,
                endTime: template.endTime,
                dayOfWeek: template.dayOfWeek,
                date: targetDate,
                isInstance: true,
                status: 'pending',
                order: template.order
              });
              await t.save();
              await scheduleTaskNotifications(userObj, t);
              tasks.push(t);
              instantiatedAny = true;
            }
          }
        }
        if (instantiatedAny) {
          tasks.sort((a, b) => a.order - b.order);
        }
      }
    }

    // 3. Evaluate instantiated tasks
    if (tasks.length > 0) {
      const evalResult = await evaluateTasks(userId, tasks);
      tasks = evalResult.tasks;
    }

    // 4. Generate daily reports for each day in this week where tasks are complete/missed
    const reports = [];
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(monUTC);
      targetDate.setDate(monUTC.getDate() + i);
      const report = await checkAndGenerateDailyReport(userId, targetDate, timezone, true);
      if (report) reports.push(report);
    }

    // 5. Get weekly report if it exists
    const weeklyReport = await checkAndGenerateWeeklyReport(userId, monUTC, timezone);

    res.json({ success: true, schedule, tasks, reports, weeklyReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle task status
// @route   PUT /api/schedules/tasks/:taskId
// @access  Private
export const toggleTask = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body; // 'completed' or 'pending'
  const userId = req.user._id;
  const timezone = req.user.timezone || 'UTC';

  try {
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }



    // Toggle status
    if (status === 'completed') {
      task.status = 'completed';
      task.completedAt = new Date();
      // Remove scheduled notifications for this task since it is complete
      await Notification.deleteMany({ taskId: task._id });
    } else {
      task.status = 'pending';
      task.completedAt = null;
      // Reschedule notifications
      await scheduleTaskNotifications(req.user, task);
    }

    await task.save();

    // Trigger report updates
    const report = await checkAndGenerateDailyReport(userId, task.date, timezone);

    res.json({ success: true, task, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Duplicate a previous day's schedule to a target day
// @route   POST /api/schedules/duplicate-day
// @access  Private
export const duplicateDaySchedule = async (req, res) => {
  const { sourceDate, targetDate } = req.body;
  const userId = req.user._id;
  const timezone = req.user.timezone || 'UTC';

  try {
    if (!sourceDate || !targetDate) {
      return res.status(400).json({ success: false, message: 'Source and target dates are required' });
    }

    const sourceUTC = getUTCFromLocal(sourceDate, '00:00', timezone);
    const targetUTC = getUTCFromLocal(targetDate, '00:00', timezone);

    // Find source schedule
    const sourceSchedule = await DaySchedule.findOne({ userId, date: sourceUTC });
    if (!sourceSchedule) {
      return res.status(404).json({ success: false, message: 'Source day schedule not found' });
    }

    const sourceTasks = await Task.find({ userId, scheduleId: sourceSchedule._id, scheduleType: 'DaySchedule' }).sort('order');

    // Create or update target schedule
    let targetSchedule = await DaySchedule.findOne({ userId, date: targetUTC });
    if (!targetSchedule) {
      targetSchedule = new DaySchedule({
        userId,
        name: sourceSchedule.name,
        date: targetUTC
      });
      await targetSchedule.save();
    }

    // Clear target day tasks
    await Task.deleteMany({ userId, scheduleId: targetSchedule._id, scheduleType: 'DaySchedule' });

    // Copy tasks
    const newTasks = [];
    for (const st of sourceTasks) {
      const nt = new Task({
        userId,
        scheduleId: targetSchedule._id,
        scheduleType: 'DaySchedule',
        name: st.name,
        startTime: st.startTime,
        endTime: st.endTime,
        date: targetUTC,
        status: 'pending',
        order: st.order
      });
      await nt.save();
      await scheduleTaskNotifications(req.user, nt);
      newTasks.push(nt);
    }

    await checkAndGenerateDailyReport(userId, targetUTC, timezone);

    res.json({ success: true, schedule: targetSchedule, tasks: newTasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Duplicate instantiated week's tasks to another target week
// @route   POST /api/schedules/duplicate-week
// @access  Private
export const duplicateWeekSchedule = async (req, res) => {
  const { sourceWeekDate, targetWeekDate } = req.body;
  const userId = req.user._id;
  const timezone = req.user.timezone || 'UTC';

  try {
    if (!sourceWeekDate || !targetWeekDate) {
      return res.status(400).json({ success: false, message: 'Source and target week dates are required' });
    }

    const schedule = await WeekSchedule.findOne({ userId, isActive: true });
    const startDay = schedule?.startDayOfWeek || 'Monday';

    const { monUTC: srcMonUTC, sunUTC: srcSunUTC } = getStartAndEndOfWeek(sourceWeekDate, timezone, startDay);
    const { monUTC: tgtMonUTC, sunUTC: tgtSunUTC } = getStartAndEndOfWeek(targetWeekDate, timezone, startDay);

    // Find source tasks
    const srcTasks = await Task.find({
      userId,
      scheduleType: 'WeekSchedule',
      isInstance: true,
      date: { $gte: srcMonUTC, $lte: srcSunUTC }
    }).sort('order');

    if (srcTasks.length === 0) {
      return res.status(404).json({ success: false, message: 'No instantiated source tasks found to duplicate' });
    }

    // Clear target week instantiated tasks
    await Task.deleteMany({
      userId,
      scheduleType: 'WeekSchedule',
      isInstance: true,
      date: { $gte: tgtMonUTC, $lte: tgtSunUTC }
    });

    const newTasks = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const userObj = await User.findById(userId);

    for (const st of srcTasks) {
      const dayIndex = days.indexOf(st.dayOfWeek);
      if (dayIndex !== -1) {
        const targetDate = new Date(tgtMonUTC);
        targetDate.setDate(tgtMonUTC.getDate() + dayIndex);

        const nt = new Task({
          userId,
          scheduleId: st.scheduleId,
          scheduleType: 'WeekSchedule',
          name: st.name,
          startTime: st.startTime,
          endTime: st.endTime,
          dayOfWeek: st.dayOfWeek,
          date: targetDate,
          isInstance: true,
          status: 'pending',
          order: st.order
        });
        await nt.save();
        await scheduleTaskNotifications(userObj, nt);
        newTasks.push(nt);
      }
    }

    // Recompute reports for the target week
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(tgtMonUTC);
      targetDate.setDate(tgtMonUTC.getDate() + i);
      await checkAndGenerateDailyReport(userId, targetDate, timezone);
    }
    await checkAndGenerateWeeklyReport(userId, tgtMonUTC, timezone);

    res.json({ success: true, tasks: newTasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
