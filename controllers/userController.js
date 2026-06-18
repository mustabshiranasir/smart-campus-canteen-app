import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { logWalletTransaction } from '../utils/walletLog.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = await Settings.create({ userId: req.user._id });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = await Settings.create({ userId: req.user._id, ...req.body });
    } else {
      settings = await Settings.findOneAndUpdate(
        { userId: req.user._id },
        { $set: req.body },
        { new: true, runValidators: true }
      );
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, profilePictureVisibility, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.name = name || user.name;
    user.email = email || user.email;
    if (profilePictureVisibility !== undefined) {
      user.profilePictureVisibility = profilePictureVisibility;
    }
    if (phone !== undefined && phone.trim()) {
      user.phone = phone.trim();
    }
    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};


export const updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid current password' });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.status(200).json({ success: true, message: 'Password updated' });
  } catch (error) {
    next(error);
  }
};

export const topupWallet = async (req, res, next) => {
  try {
    const { amount, paymentMethod, note } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.walletBalance = Math.round((user.walletBalance || 0) + amount);
    await user.save();
    await logWalletTransaction({
      userId: user._id,
      amount,
      type: 'topup',
      paymentMethod: paymentMethod || 'wallet',
      note: note || 'Wallet top-up',
      balanceAfter: user.walletBalance,
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldFilePath = path.join(process.cwd(), 'uploads', user.profilePicture.replace(/^\/uploads\//, ''));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Store relative path to the uploaded file
    const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;
    user.profilePicture = profilePicturePath;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: 'Profile picture updated successfully',
      data: user 
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
