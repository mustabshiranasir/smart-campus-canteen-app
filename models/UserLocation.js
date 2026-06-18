import mongoose from 'mongoose';

const userLocationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, default: '' },
    role: { type: String, enum: ['student', 'faculty', 'admin'], default: 'student' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    heading: { type: Number },
    speed: { type: Number },
    isSharing: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userLocationSchema.index({ latitude: 1, longitude: 1 });
userLocationSchema.index({ isSharing: 1, lastUpdated: -1 });

const UserLocation = mongoose.model('UserLocation', userLocationSchema);
export default UserLocation;
