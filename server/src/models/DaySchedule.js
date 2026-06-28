import mongoose from 'mongoose';

const dayScheduleSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a user cannot have two schedules with the exact same date
dayScheduleSchema.index({ userId: 1, date: 1 }, { unique: true });

const DaySchedule = mongoose.model('DaySchedule', dayScheduleSchema);
export default DaySchedule;
