import nodemailer from 'nodemailer';

// Create transporter lazily so env vars are always fresh
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER?.trim(),
    pass: process.env.EMAIL_PASS?.trim().replace(/\s/g, '') // Remove spaces from app password
  }
});

export const sendOTP = async (email, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('------------------------------------');
    console.log(`Verification OTP for ${email}: ${otp}`);
    console.log('------------------------------------');
    return;
  }

  const mailOptions = {
    from: `"Grozy Marketplace" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #0ea5e9;">Verify Your Account</h2>
        <p>Your One-Time Password (OTP) for registration is:</p>
        <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
      </div>
    `
  };

  const transporter = createTransporter();
  await transporter.sendMail(mailOptions);
};

export const sendAdminAlert = async (subject, message) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'sarusondj@gmail.com';

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('--- ADMIN ALERT ---');
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log('-------------------');
    return;
  }

  const mailOptions = {
    from: `"Grozy System" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `[ADMIN ALERT] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px;">
        <div style="background: #0ea5e9; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">🔔 Grozy Business Alert</h2>
        </div>
        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 14px; color: #374151;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;"/>
          <p style="font-size: 10px; color: #9ca3af;">Automated system notification from Grozy Infrastructure.</p>
        </div>
      </div>
    `
  };

  const transporter = createTransporter();
  await transporter.sendMail(mailOptions);
};

export const sendCouponEmail = async (email, shopName, coupon) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`--- SIMULATED EMAIL TO ${email} ---`);
    console.log(`From: ${shopName}`);
    console.log(`Offer: ${coupon.code} - ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : ' OFF'}`);
    console.log('------------------------------------');
    return;
  }

  const mailOptions = {
    from: `"${shopName} via Grozy" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Special Offer from ${shopName}! 🎁`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 20px; max-width: 500px; margin: auto; background: #fafafa;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 30px; border-radius: 15px; text-align: center; color: white;">
          <h2 style="margin: 0; text-transform: uppercase; letter-spacing: 2px;">Exclusive Discount</h2>
          <p style="opacity: 0.8; font-size: 14px;">A gift from ${shopName}</p>
          <div style="margin: 20px 0; background: white; color: #0ea5e9; padding: 15px; border-radius: 10px; font-weight: 900; font-size: 24px; border: 2px dashed #0ea5e9;">
            ${coupon.code}
          </div>
          <p style="font-size: 20px; font-weight: bold; margin: 0;">${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : ' OFF'}</p>
        </div>
        <div style="padding: 20px; text-align: center;">
          <p style="color: #666; font-size: 14px;">Use this code on your next order at our store!</p>
          <a href="https://grozy.com" style="display: inline-block; padding: 12px 25px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-top: 10px;">Shop Now</a>
        </div>
      </div>
    `
  };

  const transporter = createTransporter();
  await transporter.sendMail(mailOptions);
};
