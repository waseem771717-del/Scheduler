import Task from '../models/Task.js';
import DailyReport from '../models/DailyReport.js';
import WeeklyReport from '../models/WeeklyReport.js';
import User from '../models/User.js';
import WeekSchedule from '../models/WeekSchedule.js';
import { getUTCFromLocal, getStartAndEndOfWeek } from './scheduleController.js';

// Get Dashboard Statistics
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
  const userId = req.user._id;
  const clientTimezone = req.query.timezone || req.user.timezone || 'UTC';
  const clientDate = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const schedule = await WeekSchedule.findOne({ userId, isActive: true });
    const startDay = schedule?.startDayOfWeek || 'Monday';

    // 1. Get dates for Today
    const todayStartUTC = getUTCFromLocal(clientDate, '00:00', clientTimezone);
    const todayEndUTC = getUTCFromLocal(clientDate, '23:59', clientTimezone);

    // 2. Get dates for Week
    const { monUTC, sunUTC } = getStartAndEndOfWeek(clientDate, clientTimezone, startDay);

    // 3. Get dates for Month
    const localNow = new Date(new Date(clientDate).toLocaleString('en-US', { timeZone: clientTimezone }));
    const firstDayOfMonth = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
    const lastDayOfMonth = new Date(localNow.getFullYear(), localNow.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthStartUTC = getUTCFromLocal(firstDayOfMonth, '00:00', clientTimezone);
    const monthEndUTC = getUTCFromLocal(lastDayOfMonth, '23:59', clientTimezone);

    // Fetch Tasks for ranges
    const todayTasks = await Task.find({ userId, date: { $gte: todayStartUTC, $lte: todayEndUTC } });
    const weekTasks = await Task.find({ userId, date: { $gte: monUTC, $lte: sunUTC }, isInstance: { $ne: false } });
    const monthTasks = await Task.find({ userId, date: { $gte: monthStartUTC, $lte: monthEndUTC }, isInstance: { $ne: false } });
    const allTasks = await Task.find({ userId, $or: [{ scheduleType: 'DaySchedule' }, { isInstance: true }] });

    // Helper to calculate progress object
    const calculateProgress = (tasks) => {
      const total = tasks.length;
      if (total === 0) return { total: 0, completed: 0, missed: 0, pending: 0, percentage: 0 };
      const completed = tasks.filter(t => t.status === 'completed').length;
      const missed = tasks.filter(t => t.status !== 'completed').length; // Unchecked / not completed
      const pending = total - completed;
      const percentage = Math.round((completed / total) * 100);
      return { total, completed, missed, pending, percentage };
    };

    const todayProgress = calculateProgress(todayTasks);
    const weekProgress = calculateProgress(weekTasks);
    const monthProgress = calculateProgress(monthTasks);
    const lifetimeProgress = calculateProgress(allTasks);

    // 4. Calculate Streak (Current and Longest)
    const reports = await DailyReport.find({ userId }).sort({ date: 1 }); // Chronological order

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // To calculate current streak accurately, check if today is complete or yesterday was complete
    const yesterday = new Date(todayStartUTC);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayReport = reports.find(r => r.date.getTime() === todayStartUTC.getTime());
    const yesterdayReport = reports.find(r => r.date.getTime() === yesterday.getTime());

    // Calculate longest streak from history
    reports.forEach((report) => {
      if (report.completionRate >= 50) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    });

    // Calculate current streak
    if (todayReport && todayReport.completionRate >= 50) {
      currentStreak = todayReport.streakCount;
    } else if (yesterdayReport && yesterdayReport.completionRate >= 50) {
      currentStreak = yesterdayReport.streakCount;
    } else {
      currentStreak = 0;
    }

    // Ensure longest streak is at least the current streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    res.json({
      success: true,
      stats: {
        todayProgress,
        weekProgress,
        monthProgress,
        totalTasks: lifetimeProgress.total,
        completedTasks: lifetimeProgress.completed,
        missedTasks: lifetimeProgress.missed,
        pendingTasksToday: todayProgress.pending,
        currentStreak,
        longestStreak,
        productivityPercentage: lifetimeProgress.percentage
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Daily Reports for Calendar view
// @route   GET /api/reports/calendar
// @access  Private
export const getCalendarStats = async (req, res) => {
  const { start, end } = req.query; // ISO strings
  const userId = req.user._id;

  try {
    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    const reports = await DailyReport.find({
      userId,
      date: { $gte: new Date(start), $lte: new Date(end) }
    }).sort({ date: 1 });

    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get specific historical day's tasks & report
// @route   GET /api/reports/history/:dateStr
// @access  Private
export const getHistoryDay = async (req, res) => {
  const { dateStr } = req.params; // YYYY-MM-DD
  const userId = req.user._id;
  const timezone = req.user.timezone || 'UTC';

  try {
    const targetUTC = getUTCFromLocal(dateStr, '00:00', timezone);
    const endUTC = getUTCFromLocal(dateStr, '23:59', timezone);

    // Find schedule if any
    const schedule = await DailyReport.findOne({ userId, date: targetUTC });

    // Fetch tasks for that day
    const tasks = await Task.find({
      userId,
      date: { $gte: targetUTC, $lte: endUTC },
      $or: [{ scheduleType: 'DaySchedule' }, { isInstance: true }]
    }).sort('order');

    res.json({
      success: true,
      date: targetUTC,
      report: schedule || null,
      tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
