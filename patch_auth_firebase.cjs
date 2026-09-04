const fs = require('fs');

const code = `import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase.js';

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

async function sendVerificationEmail(email: string, code: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !transporter) {
    console.warn(\`[WARNING] SMTP credentials not configured in .env! Could not send actual email to \${email}\`);
    console.log(\`[VERIFICATION EMAIL FALLBACK] Code for \${email} is: \${code}\`);
    return false;
  }
  
  try {
    await transporter.sendMail({
      from: \`"Campus AI Team" <\${process.env.SMTP_USER}>\`,
      to: email,
      subject: 'Your Campus AI Verification Code',
      text: \`Welcome to Campus AI! Your 6-digit verification code is: \${code}. It expires in 15 minutes.\`,
      html: \`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h2 style="color: #2563eb;">Campus AI</h2>
          <p style="font-size: 16px; color: #475569;">Welcome! Please use the following code to verify your email address.</p>
          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h1 style="margin: 0; font-size: 32px; letter-spacing: 4px; color: #0f172a;">\${code}</h1>
          </div>
          <p style="font-size: 14px; color: #64748b;">This code will expire in 15 minutes.</p>
        </div>
      \`,
    });
    console.log(\`[VERIFICATION EMAIL] Successfully sent code to \${email}\`);
    return true;
  } catch (error) {
    console.error('[VERIFICATION EMAIL ERROR] Failed to send email:', error);
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

// In-memory session store for prototype
const sessions = new Map<string, UserSession>();

const SALT = 'campus_ai_salt_2026';
export function hashPassword(pwd: string): string {
  return crypto.createHmac('sha256', SALT).update(pwd).digest('hex');
}

export async function authenticateUser(email: string, password: string): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let user: any = null;
    let userId = '';
    
    usersSnap.forEach(d => {
      if (d.data().email === normalizedEmail) {
        user = d.data();
        userId = d.id;
      }
    });

    if (!user && normalizedEmail === 'admin@example.com' && password === 'password') {
      const id = \`usr_admin_\${Date.now()}\`;
      const adminData = {
        id,
        email: 'admin@example.com',
        passwordHash: hashPassword('password'),
        name: 'Administrator',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', id), adminData);
      
      const token = crypto.randomBytes(32).toString('hex');
      const session: UserSession = {
        userId: id,
        email: adminData.email,
        role: adminData.role as any,
        name: adminData.name,
        token,
        createdAt: Date.now(),
      };
      sessions.set(token, session);
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

    sessions.set(token, session);
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
    console.error('Error logging user activity:', err);
  }
}

export async function verifyUserCode(email: string, code: string): Promise<{ success: boolean; session?: UserSession; error?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const usersSnap = await getDocs(collection(db, 'users'));
    
    let user: any = null;
    let userId = '';
    
    usersSnap.forEach(d => {
      if (d.data().email === normalizedEmail) {
        user = d.data();
        userId = d.id;
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

    await updateDoc(doc(db, 'users', userId), {
      verified: true,
      verificationCode: null,
      verificationCodeExpires: null,
      lastActive: new Date().toISOString()
    });

    const token = crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      userId,
      email: user.email,
      role: user.role,
      name: user.name,
      token,
      createdAt: Date.now(),
    };

    sessions.set(token, session);
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
): Promise<{ success: boolean; verificationRequired?: boolean; verificationCode?: string; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let exists = false;
    usersSnap.forEach(d => {
      if (d.data().email === normalizedEmail) exists = true;
    });

    if (exists) {
      return { success: false, error: 'User with this email already exists.' };
    }

    const id = \`usr_\${Date.now()}_\${crypto.randomBytes(4).toString('hex')}\`;
    const passwordHash = hashPassword(password);
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = Date.now() + 15 * 60 * 1000;

    await setDoc(doc(db, 'users', id), {
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
    });

    await sendVerificationEmail(normalizedEmail, verificationCode);

    return {
      success: true,
      verificationRequired: true,
      error: undefined
    };
  } catch (err: any) {
    console.error('Registration error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export function verifySessionToken(token?: string): UserSession | null {
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(token?: string): boolean {
  if (!token) return false;
  return sessions.delete(token);
}
`;

fs.writeFileSync('server/auth.ts', code);
console.log('auth.ts restored to Firebase.');
