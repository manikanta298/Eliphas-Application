const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const generateTokens = (id) => {
  const secret        = process.env.JWT_SECRET        || 'logicore_fallback_secret';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'logicore_refresh_fallback';
  const accessToken = jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
  const refreshToken = jwt.sign({ id }, refreshSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

// ── Nodemailer transporter ──────────────────────────────────────
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await ActivityLog.create({
      user: user._id, userName: user.name,
      action: 'LOGIN', module: 'Auth',
      description: 'User logged in', ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        accessToken, refreshToken,
        user: {
          _id: user._id, name: user.name, email: user.email,
          role: user.role, permissions: user.permissions,
          assignedSites: user.assignedSites,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'logicore_refresh_fallback');
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, data: tokens });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Refresh token expired, please login again' });
  }
};

exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password -refreshToken')
    .populate('assignedSites', 'name code clientCompany');
  res.json({ success: true, data: user });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Forgot Password — send reset link to admin email ───────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      // Don't reveal if user exists — always return success
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Eliphas ERP" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || 'manikantakambala12@gmail.com',
      subject: '🔐 Password Reset Request — Eliphas ERP',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
          <h2 style="color:#1a3c8f;margin-bottom:8px;">Password Reset Request</h2>
          <p style="color:#475569;margin-bottom:4px;">A reset was requested for:</p>
          <p style="font-weight:700;color:#0f172a;margin-bottom:20px;">${user.name} (${user.email})</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#1a3c8f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:20px;">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:0.82rem;">This link expires in <strong>1 hour</strong>.</p>
          <p style="color:#94a3b8;font-size:0.82rem;">If you didn't request this, ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
          <p style="color:#cbd5e1;font-size:0.75rem;">Eliphas ERP System</p>
        </div>
      `,
    });

    res.json({ success: true, message: 'Password reset link sent to admin email.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send email. Check GMAIL config in .env' });
  }
};

// ── Reset Password — verify token + set new password ───────────
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
