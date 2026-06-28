import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'scheduleType',
    },
    scheduleType: {
      type: String,
      required: true,
      enum: ['DaySchedule', 'WeekSchedule'],
    },
    name: {
      type: String,
      required: [true, 'Task name is required'],
      trim: true,
    },
    startTime: {
      type: String, // "HH:MM" e.g., "14:00" or "08:30"
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // "HH:MM" e.g., "15:00" or "09:00"
      required: [true, 'End time is required'],
    },
    dayOfWeek: {
      type: String, // For weekly schedules: 'Monday', 'Tuesday', ...
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: function () {
        return this.scheduleType === 'WeekSchedule';
      },
    },
    date: {
      type: Date, // For Special Day tasks AND instantiated Weekly tasks
      required: function () {
        return this.scheduleType === 'DaySchedule' || this.isInstance === true;
      },
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'missed'],
      default: 'pending',
    },
    completedAt: {
      type: Date,
    },
    isInstance: {
      type: Boolean,
      default: false, // For weekly template tasks, this is false. When instantiated for a week, it becomes true.
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups
taskSchema.index({ userId: 1, date: 1 });
taskSchema.index({ scheduleId: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
