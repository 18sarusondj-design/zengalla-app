import User from '../models/User.js';
import Shop from '../models/Shop.js';
import jwt from 'jsonwebtoken';
import { sendOTP } from '../utils/mailer.js';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isValidPassword = (password) => {
  // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
};

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    let { 
      name, email, password, phone, role = 'customer', shopId,
      shop_address, shop_lat, shop_lng, pinCode,
      photoUrl, documentUrl, selfieUrl, accountName, accountNumber, ifscCode, bankName
    } = req.body;
    
    if (role === 'delivery') {
      if (!name || !phone || !photoUrl || !documentUrl || !selfieUrl) {
        return res.status(400).json({ error: 'Name, phone, profile photo, document, and selfie are required for delivery boy registration' });
      }
      email = email || `${phone}@delivery.zengalla.com`;
      password = password || Math.random().toString(36).slice(-10) + 'A1!'; // Dummy strong password
    } else {
      if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
      
      if (!isValidPassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.' });
      }
    }

    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin registration via API is strictly forbidden' });
    }

    if (['staff'].includes(role)) {
      let requestingUser = null;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
          requestingUser = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
          return res.status(401).json({ error: 'Invalid or expired authorization token' });
        }
      } else {
        return res.status(401).json({ error: 'Authorization token required for internal role creation' });
      }

      if (role === 'staff' && requestingUser.role !== 'vendor') {
        return res.status(403).json({ error: 'Only vendors can create staff accounts' });
      }
    }

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

    const isInternal = ['staff'].includes(role); // Delivery is no longer internal, requires OTP
    const status = (role === 'vendor' || role === 'delivery') ? 'pending' : 'active';
    
    user = await User.create({ 
      name, email: email.toLowerCase(), password, phone, role, status, 
      shopId: shopId || null,
      otp: isInternal ? null : otp,
      otpExpires: isInternal ? null : otpExpires,
      isVerified: isInternal,
      photoUrl: photoUrl || '',
      documentUrl: documentUrl || '',
      selfieUrl: selfieUrl || '',
      accountName: accountName || '',
      accountNumber: accountNumber || '',
      ifscCode: ifscCode || '',
      bankName: bankName || ''
    });

    // If vendor, create the initial shop record
    if (role === 'vendor') {
      const shop = await Shop.create({
        owner: user._id,
        name: name,
        phone: phone || '',
        address: shop_address || '',
        pinCode: pinCode || '000000',
        location: {
          type: 'Point',
          coordinates: [Number(shop_lng) || 75.1240, Number(shop_lat) || 15.3647],
          address: shop_address || ''
        },
        isActive: true,
        isApproved: false
      });
      user.shopId = shop._id;
      await user.save();
    }

    // Only send OTP for non-internal users (Customers/Vendors/Delivery)
    if (!isInternal) {
      if (role === 'delivery') {
        console.log(`\n\n[DELIVERY REGISTRATION OTP]: ${otp} for phone ${phone}\n\n`);
        try {
          if (process.env.FAST2SMS_API_KEY) {
            const fast2smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=otp&variables_values=${otp}&numbers=${phone}`;
            await fetch(fast2smsUrl, { method: 'GET' });
          }
        } catch (smsErr) {
          console.error('Fast2SMS Error:', smsErr);
        }
      } else {
        try {
          await sendOTP(email, otp);
        } catch (mailErr) {
          console.log(`⚠️ Initial Mail failed for ${email}. Code: ${otp}`);
        }
      }
    }

    res.status(201).json({ 
      success: true, 
      message: isInternal ? 'Registration successful.' : 'Registration successful. Please verify your OTP.',
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
    const { email, phone, otp } = req.body;
    if ((!email && !phone) || !otp) return res.status(400).json({ error: 'Email/Phone and OTP required' });

    let query = { otp, otpExpires: { $gt: Date.now() } };
    if (phone) {
      query.phone = phone;
    } else if (email) {
      query.email = email.toLowerCase();
    }

    const user = await User.findOne(query);

    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);
    res.json({ success: true, token: accessToken, refreshToken, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
export const googleAuth = async (req, res) => {
  try {
    const { token, role = 'customer' } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (user.status === 'suspended' || user.status === 'rejected' || user.status === 'inactive') {
        return res.status(403).json({ error: `Account is ${user.status}` });
      }
      if (!user.googleId) {
        user.googleId = googleId;
        user.isVerified = true;
        if (picture && !user.photoUrl) user.photoUrl = picture;
        await user.save();
      }
    } else {
      user = new User({
        name,
        email: email.toLowerCase(),
        googleId,
        role,
        isVerified: true,
        photoUrl: picture || '',
      });
      await user.save();
    }

    const { accessToken, refreshToken } = generateTokens(user);

    let shopDetails = null;
    if (user.role === 'vendor' && user.shopId) {
      shopDetails = await Shop.findById(user.shopId);
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl,
        shopId: user.shopId,
        shop: shopDetails
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Email not registered' });

    if (user.role === 'delivery') {
      return res.status(403).json({ error: 'Delivery partners must log in using Phone Number and OTP.' });
    }

    if (!user.isVerified && user.role !== 'staff' && user.role !== 'delivery') {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }

    if (user.status === 'suspended' || user.status === 'rejected' || user.status === 'inactive') {
      return res.status(403).json({ error: `Account is ${user.status}` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

    const { accessToken, refreshToken } = generateTokens(user);
    const safeUser = user.toJSON();
    res.json({ success: true, token: accessToken, refreshToken, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/send-login-otp
export const sendLoginOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const user = await User.findOne({ phone, role: 'delivery' });
    if (!user) return res.status(404).json({ error: 'No delivery partner found with this phone number' });

    if (user.status === 'suspended' || user.status === 'rejected' || user.status === 'inactive') {
      return res.status(403).json({ error: `Account is ${user.status}` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await user.save();

    console.log(`\n\n[DELIVERY LOGIN OTP]: ${otp} for phone ${phone}\n\n`);

    try {
      if (process.env.FAST2SMS_API_KEY) {
        const fast2smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=otp&variables_values=${otp}&numbers=${phone}`;
        await fetch(fast2smsUrl, { method: 'GET' });
      }
    } catch (smsErr) {
      console.error('Fast2SMS Error:', smsErr);
    }

    res.json({ success: true, message: 'OTP sent successfully to your phone number.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/verify-login-otp
export const verifyLoginOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const user = await User.findOne({ 
      phone,
      role: 'delivery',
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    if (user.status === 'suspended' || user.status === 'rejected' || user.status === 'inactive') {
      return res.status(403).json({ error: `Account is ${user.status}` });
    }

    user.otp = null;
    user.otpExpires = null;
    if (!user.isVerified) user.isVerified = true;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);
    res.json({ success: true, token: accessToken, refreshToken, user });
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

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.' });
    }

    user.password = password;
    user.otp = null;
    user.otpExpires = null;
    user.tokenVersion += 1;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('shopBalances.shopId', 'name');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/auth/me
export const updateMe = async (req, res) => {
  try {
    const { name, phone, deliveryModeEnabled, addresses, location, address, pincode, accountName, accountNumber, ifscCode, bankName } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (deliveryModeEnabled !== undefined) update.deliveryModeEnabled = deliveryModeEnabled;
    if (addresses !== undefined) update.addresses = addresses;
    if (location !== undefined) update.location = location;
    if (address !== undefined) update.address = address;
    if (pincode !== undefined) update.pincode = pincode;
    if (accountName !== undefined) update.accountName = accountName;
    if (accountNumber !== undefined) update.accountNumber = accountNumber;
    if (ifscCode !== undefined) update.ifscCode = ifscCode;
    if (bankName !== undefined) update.bankName = bankName;

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
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.' });
    }
    const user = await User.findById(req.user._id).select('+password');
    user.password = password;
    user.tokenVersion += 1;
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

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.' });
    }

    user.password = newPassword;
    user.tokenVersion += 1;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/refresh
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Refresh token revoked' });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);
    res.json({ success: true, token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.tokenVersion += 1;
      await user.save();
    }
    res.json({ success: true, message: 'Logged out from all devices successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

