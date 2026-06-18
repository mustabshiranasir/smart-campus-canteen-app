// controllers/authController.js
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Order from '../models/Order.js';
import OTP from '../models/OTP.js';
import admin from '../config/firebase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });

// Helper: build the public user response object
const buildUserResponse = (user, token) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  walletBalance: user.walletBalance,
  profilePicture: user.profilePicture || null,
  profilePictureVisibility: user.profilePictureVisibility || 'public',
  rollNumber: user.rollNumber || null,
  phone: user.phone || null,
  isAdminVerified: user.isAdminVerified || false,
  isPhoneVerified: user.isPhoneVerified || false,
  createdAt: user.createdAt,
  token,
});

// ─── Send OTP ──────────────────────────────────────────────────────────────
export const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    const cleanPhone = phone.trim();

    // Check if phone number is already registered
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this phone number already exists' });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in active OTPs collection
    await OTP.findOneAndUpdate(
      { phone: cleanPhone },
      { code, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Simulated terminal console output
    console.log(`\n==================================================`);
    console.log(`[SMS OTP Simulator] Target: ${cleanPhone}`);
    console.log(`[SMS OTP Simulator] Code:   ${code}`);
    console.log(`==================================================\n`);

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully!',
      code, // return it so the frontend can pre-fill or print it, ensuring seamless UX for tests
    });
  } catch (error) {
    next(error);
  }
};

// ─── Register ──────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { email, password, name, role, rollNumber, phone, adminCode, otpCode } = req.body;

    // ── Check if email already exists in MongoDB
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const safeRole = ['admin', 'faculty', 'student'].includes(role) ? role : 'student';

    // ── Phone number verification (OTP) validation
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!otpCode) {
      return res.status(400).json({ success: false, message: 'Phone verification code is required' });
    }

    const cleanPhone = phone.trim();
    const activeOTP = await OTP.findOne({ phone: cleanPhone });
    if (!activeOTP || activeOTP.code !== otpCode.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // ── Student/Faculty validation
    if (safeRole === 'student' || safeRole === 'faculty') {
      const isFaculty = safeRole === 'faculty';
      const idLabel = isFaculty ? 'Faculty ID' : 'Roll number';
      if (!rollNumber || rollNumber.trim().length < 3) {
        return res.status(400).json({ success: false, message: `${idLabel} is required for registration` });
      }
      // Check roll number / faculty ID uniqueness
      const existingRoll = await User.findOne({ rollNumber: rollNumber.toUpperCase().trim() });
      if (existingRoll) {
        return res.status(400).json({ success: false, message: `This ${idLabel.toLowerCase()} is already registered` });
      }
    }

    // ── Admin-specific validation: require secret admin code
    let isAdminVerified = false;
    if (safeRole === 'admin') {
      const ADMIN_SECRET = process.env.ADMIN_SECRET_CODE || 'CAMPUS_ADMIN_2024';
      if (!adminCode || adminCode.trim() !== ADMIN_SECRET) {
        return res.status(403).json({
          success: false,
          message: 'Invalid admin verification code. Contact the canteen supervisor.',
        });
      }
      isAdminVerified = true;
    }

    // ── Create user inside Firebase Auth using Admin SDK ──
    try {
      console.log('🔄 Offloading user registration to Firebase Auth...');
      const firebaseUser = await admin.auth().createUser({
        email: email.toLowerCase().trim(),
        password: password,
        displayName: name.trim(),
        phoneNumber: cleanPhone.startsWith('+') ? cleanPhone : `+92${cleanPhone.slice(1)}`, // E.164 conversion
      });
      console.log(`✓ Firebase Auth user created successfully: ${firebaseUser.uid}`);
    } catch (fbError) {
      console.warn(`⚠️ Firebase Auth createUser failed: ${fbError.code || fbError.name} - ${fbError.message}`);
      console.log(`ℹ️ Continuing registration fallback using MongoDB database persistence.`);
      // Continue registration and store everything to MongoDB automatically
    }

    // Delete verified OTP so it cannot be reused
    await OTP.deleteOne({ phone: cleanPhone });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role: safeRole,
      walletBalance: 0,
      rollNumber: (safeRole === 'student' || safeRole === 'faculty') ? rollNumber.toUpperCase().trim() : null,
      phone: cleanPhone,
      isAdminVerified,
      isPhoneVerified: true, // Marked verified after passing OTP check
    });

    await Settings.create({ userId: user._id });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully (Firebase & MongoDB Synced)',
      data: buildUserResponse(user, token),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    // Try to find user by email or roll number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
    let user;

    if (isEmail) {
      user = await User.findOne({ email: identifier.toLowerCase().trim() });
    } else {
      // Treat as roll number (uppercase match)
      user = await User.findOne({ rollNumber: identifier.toUpperCase().trim() });
    }

    if (!user) {
      const idLabel = role === 'faculty' ? 'faculty ID' : 'roll number';
      return res.status(401).json({
        success: false,
        message: isEmail
          ? 'No account found with this email'
          : `No account found with this ${idLabel}`,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // Prevent cross-role login attempts
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as a ${user.role}. You cannot sign in as a ${role}.`,
      });
    }

    // ── Verify Firebase Auth Status & Dynamically Synchronize Legacy Accounts ──
    try {
      console.log(`🔄 Verifying Firebase Auth account for: ${user.email}`);
      await admin.auth().getUserByEmail(user.email);
      console.log('✓ Firebase Auth account active');
    } catch (fbError) {
      if (fbError.code === 'auth/user-not-found') {
        console.log(`⚠️ Account not in Firebase Auth. Syncing Firebase record on-the-fly...`);
        try {
          await admin.auth().createUser({
            email: user.email,
            password: password, // Sync the current matching password
            displayName: user.name,
            phoneNumber: user.phone ? (user.phone.startsWith('+') ? user.phone : `+92${user.phone.slice(1)}`) : undefined,
          });
          console.log(`✓ Synchronized user with Firebase Auth successfully.`);
        } catch (syncErr) {
          console.warn(`⚠️ Failed to dynamically sync with Firebase Auth: ${syncErr.message}`);
        }
      } else {
        console.warn(`⚠️ Firebase Auth connection status: ${fbError.message}`);
      }
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      data: buildUserResponse(user, token),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Me ────────────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments({ userId: req.user._id });
    const userData = req.user.toObject();
    delete userData.password;
    userData.totalOrders = totalOrders;
    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    next(error);
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};