import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    notifyTime: {
      type: Date,
      required: true,
    },
    sent: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['before_10', 'before_5', 'start', 'missed'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, sent: 1, notifyTime: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
