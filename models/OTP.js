import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, trim: true },
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-deletes after 5 minutes (300 seconds)
  }
);

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
