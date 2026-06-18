import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin', 'faculty'], default: 'student' },
    walletBalance: { type: Number, default: 0 },
    profilePicture: { type: String, default: null },
    profilePictureVisibility: { type: String, enum: ['public', 'private'], default: 'public' },

    // Student-specific fields
    rollNumber: {
      type: String,
      sparse: true,   // allows null/undefined but enforces uniqueness when present
      unique: true,
      uppercase: true,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },

    // Admin verification flag (set to true after correct admin code at registration)
    isAdminVerified: { type: Boolean, default: false },

    // Phone verification flag
    isPhoneVerified: { type: Boolean, default: false },

    // Prank order protection
    strikes: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    cashBlockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;

