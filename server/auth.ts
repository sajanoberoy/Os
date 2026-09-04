import crypto from 'crypto';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc 
} from './firebase.js';

let transporter: nodemailer.Transporter;

// Use real SMTP if configured
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('[Auth] SMTP Mailer configured.');
}

const USERS_BACKUP_PATH = path.join(process.cwd(), 'data', 'users.json');
const SESSIONS_BACKUP_PATH = path.join(process.cwd(), 'data', 'sessions.json');

function ensureDataDir() {
  const dir = path.dirname(USERS_BACKUP_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readLocalUsersBackup(): Record<string, any> {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_BACKUP_PATH)) {
      return JSON.parse(fs.readFileSync(USERS_BACKUP_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[Auth Backup] Error reading users.json:', e);
  }
  return {};
}

function writeLocalUsersBackup(users: Record<string, any>) {
  try {
    ensureDataDir();
    fs.writeFileSync(USERS_BACKUP_PATH, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('[Auth Backup] Error writing users.json:', e);
  }
}

function readLocalSessionsBackup(): Record<string, UserSession> {
  try {
    ensureDataDir();
    if (fs.existsSync(SESSIONS_BACKUP_PATH)) {
      return JSON.parse(fs.readFileSync(SESSIONS_BACKUP_PATH, 'utf8'));
    }
  } catch (e) {
    // Non-fatal
  }
  return {};
}

function writeLocalSessionsBackup(sessionsRecord: Record<string, UserSession>) {
  try {
    ensureDataDir();
    fs.writeFileSync(SESSIONS_BACKUP_PATH, JSON.stringify(sessionsRecord, null, 2), 'utf8');
  } catch (e) {
    // Non-fatal
  }
}

async function sendVerificationEmail(email: string, code: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !transporter) {
    console.warn(`[WARNING] SMTP credentials not configured in .env! Could not send actual email to ${email}`);
    console.log(`[VERIFICATION EMAIL FALLBACK] Code for ${email} is: ${code}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Campus AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Campus AI Account',
      text: `Welcome to Campus AI! Your 6-digit verification code is: ${code}\n\nThis code will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center;">Welcome to Campus AI</h2>
          <p>Please use the following verification code to activate your student account:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #64748b; text-align: center;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log(`[Auth] Verification email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('[Auth] Failed to send email via SMTP:', err);
    console.log(`[VERIFICATION EMAIL FALLBACK] Code for ${email} is: ${code}`);
    return false;
  }
}

export interface UserSession {
  userId: string;
  email: string;
  role: 'student' | 'demo' | 'admin';
  name: string;
  token: string;
  createdAt: number;
}

// In-memory session store with persistent backup
const sessions = new Map<string, UserSession>();

function registerActiveSession(token: string, session: UserSession) {
  sessions.set(token, session);
  const local = readLocalSessionsBackup();
  local[token] = session;
  writeLocalSessionsBackup(local);
}

const SALT = 'campus_ai_salt_2026';
export function hashPassword(pwd: string): string {
  return crypto.createHmac('sha256', SALT).update(pwd).digest('hex');
}

export async function authenticateUser(email: string, password: string): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    let usersList: any[] = [];
    let usedFirestore = false;

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => {
        usersList.push({ ...d.data(), id: d.id });
      });
      usedFirestore = true;

      // Sync to local backup
      const backupMap: Record<string, any> = {};
      usersList.forEach(u => { backupMap[u.id] = u; });
      writeLocalUsersBackup(backupMap);
    } catch (fsErr) {
      console.warn('[Auth] Firestore getDocs failed, falling back to local users backup:', fsErr);
      const localUsers = readLocalUsersBackup();
      usersList = Object.values(localUsers);
    }

    let user: any = null;
    let userId = '';
    
    usersList.forEach(u => {
      if (u.email === normalizedEmail) {
        user = u;
        userId = u.id;
      }
    });

    // Default admin initialization if none exists
    if (!user && normalizedEmail === 'admin@example.com' && password === 'password') {
      const id = `usr_admin_${Date.now()}`;
      const adminData = {
        id,
        email: 'admin@example.com',
        passwordHash: hashPassword('password'),
        name: 'Administrator',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      
      try {
        await setDoc(doc(db, 'users', id), adminData);
      } catch (e) {
        console.warn('[Auth] Could not write admin to Firestore:', e);
      }
      const local = readLocalUsersBackup();
      local[id] = adminData;
      writeLocalUsersBackup(local);
      
      const token = crypto.randomBytes(32).toString('hex');
      const session: UserSession = {
        userId: id,
        email: adminData.email,
        role: adminData.role as any,
        name: adminData.name,
        token,
        createdAt: Date.now(),
      };
      registerActiveSession(token, session);
      return { success: true, session };
    }

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (user.role === 'student' && user.verified === false) {
      return { success: false, error: 'verification_required' };
    }

    const hashedInput = hashPassword(password);
    const isValid = hashedInput === user.passwordHash;

    if (!isValid) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      userId,
      email: user.email,
      role: user.role,
      name: user.name,
      token,
      createdAt: Date.now(),
    };

    registerActiveSession(token, session);
    return { success: true, session };
  } catch(err: any) {
    console.error('Auth error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function logUserActivity(userId: string, ipAddress: string, userAgent: string, askedQuestion: boolean = false) {
  try {
    const userRef = doc(db, 'users', userId);
    const uSnap = await getDoc(userRef);
    if (uSnap.exists()) {
      const updates: any = {
        lastActive: new Date().toISOString(),
        ipAddress,
        userAgent
      };
      if (askedQuestion) {
        updates.questionsCount = (uSnap.data().questionsCount || 0) + 1;
      }
      await updateDoc(userRef, updates);
    }
  } catch (err) {
    // Non-fatal activity log failure
  }
}

export async function verifyUserCode(email: string, code: string): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    let usersList: any[] = [];
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => {
        usersList.push({ ...d.data(), id: d.id });
      });
    } catch (e) {
      const local = readLocalUsersBackup();
      usersList = Object.values(local);
    }
    
    let user: any = null;
    let userId = '';
    
    usersList.forEach(u => {
      if (u.email === normalizedEmail) {
        user = u;
        userId = u.id;
      }
    });

    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    if (user.verified === true) {
      return { success: false, error: 'Email already verified.' };
    }

    if (user.verificationCode !== code) {
      return { success: false, error: 'Invalid verification code.' };
    }

    if (Date.now() > (user.verificationCodeExpires || 0)) {
      return { success: false, error: 'Verification code has expired.' };
    }

    const updates = {
      verified: true,
      verificationCode: null,
      verificationCodeExpires: null,
      lastActive: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'users', userId), updates);
    } catch (e) {
      console.warn('[Auth] Could not updateDoc in Firestore, updating local backup:', e);
    }
    const local = readLocalUsersBackup();
    if (local[userId]) {
      local[userId] = { ...local[userId], ...updates };
      writeLocalUsersBackup(local);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      userId,
      email: user.email,
      role: user.role,
      name: user.name,
      token,
      createdAt: Date.now(),
    };

    registerActiveSession(token, session);
    return { success: true, session };
  } catch (err: any) {
    console.error('Error verifying user code:', err);
    return { success: false, error: 'Internal error during verification: ' + err.message };
  }
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  ipAddress: string = 'unknown',
  userAgent: string = 'unknown'
): Promise<{ success: boolean; verificationRequired?: boolean; verificationCode?: string; emailSent?: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    let exists = false;
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => {
        if (d.data().email === normalizedEmail) exists = true;
      });
    } catch (e) {
      const local = readLocalUsersBackup();
      if (Object.values(local).some((u: any) => u.email === normalizedEmail)) {
        exists = true;
      }
    }

    if (exists) {
      return { success: false, error: 'User with this email already exists.' };
    }

    const id = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const passwordHash = hashPassword(password);
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = Date.now() + 15 * 60 * 1000;

    const userData = {
      id,
      email: normalizedEmail,
      passwordHash,
      name,
      role: 'student',
      verified: false,
      verificationCode,
      verificationCodeExpires,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      ipAddress,
      userAgent,
      questionsCount: 0
    };

    try {
      await setDoc(doc(db, 'users', id), userData);
    } catch (fsErr) {
      console.warn('[Auth] Firestore setDoc failed during registration, saving to local backup:', fsErr);
    }
    const local = readLocalUsersBackup();
    local[id] = userData;
    writeLocalUsersBackup(local);

    const emailSent = await sendVerificationEmail(normalizedEmail, verificationCode);

    return {
      success: true,
      verificationRequired: true,
      emailSent,
      verificationCode: !emailSent ? verificationCode : undefined,
      error: undefined
    };
  } catch (err: any) {
    console.error('Registration error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export function verifySessionToken(token?: string): UserSession | null {
  if (!token) return null;
  let session = sessions.get(token);
  if (!session) {
    const local = readLocalSessionsBackup();
    if (local[token]) {
      session = local[token];
      sessions.set(token, session);
    }
  }

  if (!session) return null;

  if (Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) {
    destroySession(token);
    return null;
  }
  return session;
}

export function destroySession(token?: string): boolean {
  if (!token) return false;
  sessions.delete(token);
  const local = readLocalSessionsBackup();
  if (local[token]) {
    delete local[token];
    writeLocalSessionsBackup(local);
  }
  return true;
}
