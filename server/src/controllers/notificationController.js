import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import { getUTCFromLocal } from './scheduleController.js';

// Helper to format 24h time to 12h AM/PM
const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const hours = parseInt(hStr);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${mStr} ${ampm}`;
};

// Helper to schedule notifications for a task
export const scheduleTaskNotifications = async (user, task) => {
  const userId = user._id;
  const timezone = user.timezone || 'UTC';
  const gracePeriod = user.notificationSettings?.gracePeriod ?? 5;
  const enableNotifications = user.notificationSettings?.enableNotifications ?? true;

  // Clear existing notifications for this task
  await Notification.deleteMany({ taskId: task._id });

  if (!enableNotifications) return;

  const startUTC = getUTCFromLocal(task.date, task.startTime, timezone);
  const deadlineUTC = getUTCFromLocal(task.date, task.endTime, timezone);
  const graceDeadlineUTC = new Date(deadlineUTC.getTime() + gracePeriod * 60 * 1000);

  const notificationsToCreate = [];

  // 10 minutes before
  const time10 = new Date(startUTC.getTime() - 10 * 60 * 1000);
  if (time10 > new Date()) {
    notificationsToCreate.push({
      userId,
      taskId: task._id,
      title: `Task Starts in 10 Minutes`,
      message: `"${task.name}" is scheduled to start at ${formatTime12h(task.startTime)}.`,
      notifyTime: time10,
      type: 'before_10',
    });
  }

  // 5 minutes before
  const time5 = new Date(startUTC.getTime() - 5 * 60 * 1000);
  if (time5 > new Date()) {
    notificationsToCreate.push({
      userId,
      taskId: task._id,
      title: `Task Starts in 5 Minutes`,
      message: `"${task.name}" is scheduled to start at ${formatTime12h(task.startTime)}.`,
      notifyTime: time5,
      type: 'before_5',
    });
  }

  // At start time
  if (startUTC > new Date()) {
    notificationsToCreate.push({
      userId,
      taskId: task._id,
      title: `Task Starting Now`,
      message: `It is time to start "${task.name}".`,
      notifyTime: startUTC,
      type: 'start',
    });
  }

  // Missed alert (after deadline + grace period)
  if (graceDeadlineUTC > new Date()) {
    notificationsToCreate.push({
      userId,
      taskId: task._id,
      title: `Task Deadline Missed`,
      message: `You missed the deadline for "${task.name}".`,
      notifyTime: graceDeadlineUTC,
      type: 'missed',
    });
  }

  if (notificationsToCreate.length > 0) {
    await Notification.insertMany(notificationsToCreate);
  }
};

// @desc    Get due notifications for user and mark them as sent
// @route   GET /api/notifications/due
// @access  Private
export const getDueNotifications = async (req, res) => {
  const userId = req.user._id;
  const now = new Date();

  try {
    const dueNotifications = await Notification.find({
      userId,
      sent: false,
      notifyTime: { $lte: now }
    }).populate('taskId');

    const filtered = [];

    // Filter to ensure task state matches (e.g. only show missed if task is still pending)
    for (const notif of dueNotifications) {
      const task = notif.taskId;
      if (!task) {
        // Task was deleted, skip
        notif.sent = true;
        await notif.save();
        continue;
      }

      let shouldSend = false;

      if (notif.type === 'missed') {
        if (task.status === 'pending' || task.status === 'missed') {
          shouldSend = true;
        }
      } else {
        // before_10, before_5, start
        if (task.status === 'pending') {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        filtered.push(notif);
      }

      // Mark as sent
      notif.sent = true;
      await notif.save();
    }

    res.json({ success: true, notifications: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
