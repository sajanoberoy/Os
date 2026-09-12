/**
 * Campus AI — Main Application Entry Component
 * "Your university, explained."
 */

import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ChatScreen } from './components/ChatScreen';
import { AdminPanel } from './components/AdminPanel';
import { UserProfile } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('campus_ai_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('campus_ai_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isVerifying, setIsVerifying] = useState<boolean>(Boolean(token));
  const [currentView, setCurrentView] = useState<'admin' | 'chat'>('chat');

  // Set initial view based on user role
  useEffect(() => {
    if (user?.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('chat');
    }
  }, [user?.role]);

  // Verify stored session on mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      return;
    }

    const verifySession = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          if (data.user.role === 'admin') {
            setCurrentView('admin');
          }
        } else {
          // Token invalid or expired
          handleLogout();
        }
      } catch (e) {
        // In case of network glitch in dev, keep local session
      } finally {
        setIsVerifying(false);
      }
    };

    verifySession();
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    if (newUser.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('chat');
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // ignore
      }
    }
    localStorage.removeItem('campus_ai_token');
    localStorage.removeItem('campus_ai_user');
    setToken(null);
    setUser(null);
    setCurrentView('chat');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center mx-auto text-xs animate-bounce">
            CAI
          </div>
          <p className="text-xs font-semibold text-slate-500">Connecting to Campus AI...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if ((user.role === 'admin' || user.role === 'editor') && currentView === 'admin') {
    return (
      <AdminPanel
        token={token}
        user={user}
        onLogout={handleLogout}
        onSwitchToChat={() => setCurrentView('chat')}
      />
    );
  }

  return (
    <ChatScreen
      token={token}
      user={user}
      onLogout={handleLogout}
      onSwitchToAdmin={user.role === 'admin' || user.role === 'editor' ? () => setCurrentView('admin') : undefined}
    />
  );
}
