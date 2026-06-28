import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    profilePicture: {
      type: String,
      default: '', // Store base64 or URL
    },
    timezone: {
      type: String,
      default: 'UTC', // e.g., 'America/New_York' or 'Asia/Kolkata'
    },
    notificationSettings: {
      enableNotifications: {
        type: Boolean,
        default: true,
      },
      gracePeriod: {
        type: Number,
        default: 5, // in minutes
      },
      notifyBeforeMinutes: {
        type: [Number],
        default: [10, 5, 0], // Notify 10 mins before, 5 mins before, and at start
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
