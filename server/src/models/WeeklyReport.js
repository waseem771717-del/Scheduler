import mongoose from 'mongoose';

const weeklyReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    completedCount: {
      type: Number,
      default: 0,
    },
    missedCount: {
      type: Number,
      default: 0,
    },
    totalTasks: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
    dailyBreakdown: [
      {
        day: { type: String }, // e.g., 'Monday'
        percentage: { type: Number },
        completed: { type: Number },
        missed: { type: Number },
      },
    ],
    bestDay: {
      type: String,
      default: '',
    },
    worstDay: {
      type: String,
      default: '',
    },
    averageCompletionRate: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// One weekly report per user per start date
weeklyReportSchema.index({ userId: 1, startDate: 1 }, { unique: true });

const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema);
export default WeeklyReport;
