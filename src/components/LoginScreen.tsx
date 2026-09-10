import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, BookOpen, Users, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: { email: string; name: string; role: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'student'>('student');
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sandboxNotice, setSandboxNotice] = useState<string | null>(null);

  const handleSelectRole = (role: 'admin' | 'student') => {
    setSelectedRole(role);
    setIsSignup(false);
    setIsVerifying(false);
    setError(null);
    setSandboxNotice(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignup && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSandboxNotice(null);

    try {
      const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const payload = isSignup ? { email, password, name } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 403 && data.error === 'verification_required') {
        setIsVerifying(true);
        setVerificationEmail(email);
        setError('Verification required. A code was sent to your email.');
        return;
      }

      if (data.success) {
        if (data.verificationRequired) {
          setIsVerifying(true);
          setVerificationEmail(email);
          if (data.verificationCode) {
            setVerificationCode(data.verificationCode);
            setSandboxNotice(`Sandbox active (no SMTP server): Verification code is ${data.verificationCode}`);
          }
          setError(null);
        } else if (data.session) {
          localStorage.setItem('campus_ai_token', data.session.token);
          localStorage.setItem('campus_ai_user', JSON.stringify({
            email: data.session.email,
            name: data.session.name,
            role: data.session.role,
          }));
          onLoginSuccess(data.session.token, {
            email: data.session.email,
            name: data.session.name,
            role: data.session.role,
          });
        }
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: verificationCode.trim() }),
      });
      const data = await res.json();

      if (data.success && data.session) {
        localStorage.setItem('campus_ai_token', data.session.token);
        localStorage.setItem('campus_ai_user', JSON.stringify({
          email: data.session.email,
          name: data.session.name,
          role: data.session.role,
        }));
        onLoginSuccess(data.session.token, {
          email: data.session.email,
          name: data.session.name,
          role: data.session.role,
        });
      } else {
        setError(data.error || 'Invalid or expired verification code.');
      }
    } catch (err) {
      console.error(err); setError('Verification request failed: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-100 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus AI Management & Chat</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campus AI</h1>
          <p className="text-sm font-medium text-slate-600 mt-0.5">Your university, explained.</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Grounded campus assistant with Admin Knowledge Source Management.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => handleSelectRole('admin')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Admin Panel</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRole('student')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'student'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Chat</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Verification Form vs. Login/Signup Form */}
        {isVerifying ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Email Verification Required</p>
              <p className="leading-relaxed">We've sent a 6-digit confirmation code to <strong className="font-medium text-slate-900">{verificationEmail}</strong>. Please enter it below to activate your account.</p>
            </div>

            {sandboxNotice && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <span className="font-bold text-amber-600">ℹ️</span>
                <div>
                  <p className="font-semibold">Local Sandbox Mode</p>
                  <p className="mt-0.5">{sandboxNotice}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                required
                className="w-full tracking-[0.25em] text-center font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-sm cursor-pointer bg-blue-600 hover:bg-blue-700"
            >
              <span>{isLoading ? 'Verifying...' : 'Verify Code & Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsVerifying(false);
                setError(null);
                setVerificationCode('');
              }}
              className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
            >
              Back to Sign Up / Log In
            </button>
          </form>
        ) : (
          <>
            {/* Login/Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && selectedRole === 'student' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {selectedRole === 'admin' ? 'Administrator Email' : 'Student Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full mt-2 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-sm cursor-pointer ${
                  selectedRole === 'admin' ? 'bg-slate-900 hover:bg-slate-800 border border-transparent' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <span>
                  {isLoading
                    ? 'Verifying...'
                    : selectedRole === 'admin'
                    ? 'Log In to Admin Panel'
                    : isSignup
                    ? 'Sign Up for Campus AI'
                    : 'Log In to Campus AI'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {selectedRole === 'student' && (
              <div className="mt-4 text-center text-sm">
                <span className="text-slate-600">
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}
                </span>
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="ml-1 text-blue-600 font-semibold hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  {isSignup ? 'Log in' : 'Sign up'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Pitch Quick Demo Seed */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Admin manages source files & RAG index</span>
          <span>Students chat with AI</span>
        </div>
      </motion.div>
    </div>
  );
};
