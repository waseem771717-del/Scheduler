import mongoose from 'mongoose';

const weekScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Schedule name is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDayOfWeek: {
      type: String,
      default: 'Monday',
    },
  },
  {
    timestamps: true,
  }
);

const WeekSchedule = mongoose.model('WeekSchedule', weekScheduleSchema);
export default WeekSchedule;
