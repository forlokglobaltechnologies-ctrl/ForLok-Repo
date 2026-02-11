import { z } from 'zod';
import { validatePhoneNumber } from './helpers';

// Phone number validation schema
export const phoneSchema = z
  .string()
  .min(10)
  .max(15)
  .refine((phone) => validatePhoneNumber(phone), {
    message: 'Invalid phone number format',
  });

// Email validation schema
export const emailSchema = z.string().email('Invalid email format');

// OTP validation schema
export const otpSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d+$/, 'OTP must contain only digits');

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// User registration schema
export const userRegistrationSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  userType: z.enum(['individual', 'company']),
  email: emailSchema.optional(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  // Gender is required for individual users
  if (data.userType === 'individual' && !data.gender) {
    return false;
  }
  return true;
}, {
  message: 'Gender is required for individual users',
  path: ['gender'],
});

// OTP verification schema
export const otpVerificationSchema = z.object({
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  otp: otpSchema,
  type: z.enum(['signup', 'login', 'reset_password', 'verify_phone', 'verify_email']),
}).refine((data) => data.phone || data.email, {
  message: 'Either phone or email must be provided',
});

// Login schema - accepts phone, email, or username
export const loginSchema = z.object({
  username: z.string().min(1, 'Username/Email/Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

// Location schema
export const locationSchema = z.object({
  address: z.string().min(5),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

// Route schema
export const routeSchema = z.object({
  from: locationSchema,
  to: locationSchema,
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, {
      message: 'Limit must be between 1 and 100',
    }),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
