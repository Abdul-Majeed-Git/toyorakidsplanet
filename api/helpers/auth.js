const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { supabase } = require('../db');

// JWT Secrets from environment
const JWT_SECRET = process.env.JWT_SECRET || 'ToyOraKidsSecure2026!';

/**
 * 1. Password Security
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 2. JWT Tokens & Cookies
 */
function generateToken(payload) {
  // Session expires in 4 hours
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '4h' });
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookie.parse(cookieHeader);
}

function getSessionUser(req) {
  try {
    const cookies = parseCookies(req);
    const token = cookies.toyorakids_token;
    if (!token) return null;
    
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function setSessionCookie(res, payload) {
  const token = generateToken(payload);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 4 * 60 * 60 // 4 hours in seconds
  };
  
  res.setHeader('Set-Cookie', cookie.serialize('toyorakids_token', token, cookieOptions));
}

function clearSessionCookie(res) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0 // Expire immediately
  };
  res.setHeader('Set-Cookie', cookie.serialize('toyorakids_token', '', cookieOptions));
}

/**
 * 3. Role-Based Access Control (RBAC) Mapping
 */
const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  STAFF: 'Staff',
  CUSTOMER: 'Customer'
};

function hasRole(user, allowedRoles) {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * 4. Audit Logging
 */
async function logAudit(userId, action, target, details = '') {
  if (!supabase) return;
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId || null,
      action,
      target,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}

/**
 * 5. Rate Limiting on Login (5 failed attempts in 15 minutes)
 */
async function checkLoginRateLimit(email) {
  if (!supabase) return { blocked: false };

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    // Count failed attempts in the last 15 minutes
    const { count, error } = await supabase
      .from('login_history')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .eq('status', 'failed')
      .gt('timestamp', fifteenMinutesAgo);
      
    if (error) throw error;
    
    if (count >= 5) {
      // Find time of the oldest failed attempt in this window to calculate remaining block time
      const { data: oldestAttempts } = await supabase
        .from('login_history')
        .select('timestamp')
        .eq('email', email)
        .eq('status', 'failed')
        .gt('timestamp', fifteenMinutesAgo)
        .order('timestamp', { ascending: true })
        .limit(1);

      let timeLeftSeconds = 900; // 15 mins default
      if (oldestAttempts && oldestAttempts.length > 0) {
        const oldestTime = new Date(oldestAttempts[0].timestamp).getTime();
        const blockReleaseTime = oldestTime + 15 * 60 * 1000;
        timeLeftSeconds = Math.max(0, Math.ceil((blockReleaseTime - Date.now()) / 1000));
      }
      
      return { blocked: true, timeLeftSeconds };
    }
  } catch (err) {
    console.error('Rate limiting check failed:', err);
  }
  
  return { blocked: false };
}

async function recordLoginAttempt(email, ipAddress, userAgent, status) {
  if (!supabase) return;
  try {
    await supabase.from('login_history').insert({
      email,
      ip_address: ipAddress || 'unknown',
      user_agent: userAgent || 'unknown',
      status,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to log login attempt:', err);
  }
}

/**
 * CORS and Security Headers Middleware helper
 */
function setSecurityHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; font-src 'self' https: data:");
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
  ROLES,
  hasRole,
  logAudit,
  checkLoginRateLimit,
  recordLoginAttempt,
  setSecurityHeaders
};
