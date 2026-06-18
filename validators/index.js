// validators/index.js
import { z } from 'zod';

const emailSchema = z.string().email('Enter a valid email address').min(5).max(255);
const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Phone: 10–15 digits, optionally prefixed with +
const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number (10–15 digits)');

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().optional(),
  role: z.enum(['student', 'admin', 'faculty']).optional().default('student'),

  // Required for student registrations
  rollNumber: z
    .string()
    .min(3, 'Roll number must be at least 3 characters')
    .max(20, 'Roll number is too long')
    .regex(/^[a-zA-Z0-9\-\/]+$/, 'Roll number: letters, numbers, - or / only')
    .optional(),

  // Phone required for both roles during registration
  phone: phoneSchema.optional(),

  // Admin secret code — validated server-side against env var
  adminCode: z.string().optional(),

  // Phone verification code (OTP)
  otpCode: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits').optional(),
});

// Login accepts email OR roll number via single `identifier` field
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Enter your email or roll number')
    .max(255),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['student', 'admin', 'faculty']).optional(),
});

const selectedExtraSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1).optional().default(1),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  selectedExtras: z.array(selectedExtraSchema).optional().default([]),
});

export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  isSharing: z.boolean().optional(),
});

export const orderSchema = z.object({
  paymentMethod: z.string().optional().default('wallet'),
  deliveryAddress: z.string().optional(),
  shareLiveLocation: z.boolean().optional().default(false),
  pickupLocation: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

export const cartCustomizeSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  selectedExtras: z.array(selectedExtraSchema).optional().default([]),
});

export const settingsSchema = z.object({
  notifications: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'midnight', 'warm', 'system']).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const validateRequest = (schema) => async (req, res, next) => {
  try {
    const parsedBody = await schema.parseAsync(req.body);
    req.body = parsedBody;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message,
        errors: error.errors,
      });
    }
    next(error);
  }
};