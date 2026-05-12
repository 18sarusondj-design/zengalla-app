import User from '../models/User.js';
import Shop from '../models/Shop.js';
import jwt from 'jsonwebtoken';
import { sendOTP } from '../utils/mailer.js';

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { 
      name, email, password, phone, role = 'customer', shopId,
      shop_address, shop_lat, shop_lng, pinCode,
      photoUrl, documentUrl
    } = req.body;
    
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });

    let user = await User.findOne({ email: email.toLowerCase() });
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (user) {
      if (user.isVerified) {
        return res.status(409).json({ error: 'Email already registered' });
      } else {
        // User exists but not verified - Resend OTP
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();
        
        try {
          await sendOTP(email, otp);
        } catch (mailErr) {
          console.log(`⚠️ Mail failed for ${email}. Code: ${otp}`);
        }
        
        return res.json({ 
          success: true, 
          message: 'Verification code resent! Please check your email.',
          requiresOtp: true 
        });
      }
    }

    // If vendor, verify Pin Code against coordinates using FREE OSM API
    if (role === 'vendor') {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${shop_lat}&lon=${shop_lng}&addressdetails=1`, {
          headers: { 'User-Agent': 'ZengallaRetailApp/1.0' }
        });

        if (geoRes.ok) {
          const contentType = geoRes.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const geoData = await geoRes.json();
            
            if (geoData && geoData.address) {
              const postalCode = geoData.address.postcode;
              const officialPinCode = postalCode ? postalCode.split(' ')[0].replace(/\D/g, '').substring(0, 6) : null;
              
              // Only reject if we got a clear official pin and it's completely different
              if (officialPinCode && officialPinCode !== pinCode && pinCode.substring(0,3) !== officialPinCode.substring(0,3)) {
                return res.status(400).json({ 
                  error: `Location Security Alert: The official Pin Code for this map spot is ${officialPinCode}, but you entered ${pinCode}. Please use the correct Pin Code.` 
                });
              }
            }
          }
        }
      } catch (geoErr) {
        console.error("OSM verification error:", geoErr);
      }
    }

    const isInternal = ['staff', 'delivery'].includes(role);
    const status = role === 'vendor' ? 'pending' : 'active';
    
    user = await User.create({ 
      name, email, password, phone, role, status, 
      shopId: shopId || null,
      otp: isInternal ? null : otp,
      otpExpires: isInternal ? null : otpExpires,
      isVerified: isInternal,
      photoUrl: photoUrl || '',
      documentUrl: documentUrl || ''
    });

    // If vendor, create the initial shop record
    if (role === 'vendor') {
      const shop = await Shop.create({
        owner: user._id,
        name: `${name}'s Store`,
        address: shop_address || '',
        pinCode: pinCode || '000000',
        location: {
          type: 'Point',
          coordinates: [shop_lng || 0, shop_lat || 0],
          address: shop_address || ''
        },
        isActive: true,
        isApproved: false
      });
      user.shopId = shop._id;
      await user.save();
    }

    // Only send OTP for non-internal users (Customers/Vendors)
    if (!isInternal) {
      try {
        await sendOTP(email, otp);
      } catch (mailErr) {
        console.log(`⚠️ Initial Mail failed for ${email}. Code: ${otp}`);
      }
    }

    res.status(201).json({ 
      success: true, 
      message: isInternal ? 'Registration successful.' : 'Registration successful. Please verify your email.',
      email: user.email,
      requiresOtp: !isInternal,
      user: isInternal ? user : undefined
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/verify-otp
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = signToken(user);
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isVerified && user.role !== 'staff' && user.role !== 'delivery') {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user);
    const safeUser = user.toJSON();
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate reset OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    await sendOTP(email, otp);
    res.json({ success: true, message: 'Reset code sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) return res.status(400).json({ error: 'Email, OTP and new password required' });

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired reset code' });

    user.password = password;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/auth/me
export const updateMe = async (req, res) => {
  try {
    const { name, phone, deliveryModeEnabled, addresses } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (deliveryModeEnabled !== undefined) update.deliveryModeEnabled = deliveryModeEnabled;
    if (addresses !== undefined) update.addresses = addresses;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/auth/password
export const updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'New password required' });
    const user = await User.findById(req.user._id).select('+password');
    user.password = password;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/lookup?phone=...
export const lookup = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      walletBalance: user.walletBalance || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// POST /api/auth/verify-password
export const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    res.json({ success: true, message: 'Password verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Current and new passwords required' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(401).json({ error: 'Current password incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
