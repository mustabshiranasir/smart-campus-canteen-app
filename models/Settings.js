import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    notifications: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark', 'midnight', 'warm', 'system'], default: 'light' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
