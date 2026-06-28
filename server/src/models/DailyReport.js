import mongoose from 'mongoose';

const dailyReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
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
      type: Number, // Percentage, e.g., 80
      default: 0,
    },
    summaryMessage: {
      type: String,
      default: '',
    },
    streakCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index so there is exactly one report per user per day
dailyReportSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyReport = mongoose.model('DailyReport', dailyReportSchema);
export default DailyReport;
