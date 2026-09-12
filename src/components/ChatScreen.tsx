import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, LogOut, ShieldCheck, Shield } from 'lucide-react';
import { ChatMessage, SourceCitation, UserProfile } from '../types';
import { MessageItem } from './MessageItem';
import { SourceModal } from './SourceModal';

interface ChatScreenProps {
  token: string;
  user: UserProfile;
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
}

const PITCH_PROMPTS = [
  { label: '🪪 Lost ID card', query: 'I lost my university ID card. What should I do?' },
  { label: '📍 Verification venue', query: 'Where do students go for document verification?' },
  { label: '📋 What to carry', query: 'What should I carry for document verification?' },
  { label: '⏰ Missed deadline', query: 'I missed an academic deadline. Who should I contact?' },
  { label: '🏢 Hostel allocation', query: 'How do I get my hostel allocation and what are the rules?' },
  { label: '🚪 Entry without ID', query: "What happens if I don't have my ID card yet?" },
  { label: '📥 Submitting forms', query: 'Where can I submit my documents and get proof of submission?' },
];

export const ChatScreen: React.FC<ChatScreenProps> = ({ token, user, onLogout, onSwitchToAdmin }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hi ${user.name}! I am Campus AI.\n\nI'm here to help you navigate campus life with accurate, verified information from official university handbooks, academic rules, examination guidelines, and hostel policies.`,
      nextSteps: [
        'Type any campus or academic question in the box below',
        'Or click any of the prompt pills above to get instant answers'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);

  // Automatically load last 5 past chats (question + answer) into chat stream on mount (ChatGPT style)
  useEffect(() => {
    const loadChatHistoryIntoStream = async () => {
      try {
        const res = await fetch('/api/chat/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.history && data.history.length > 0) {
          const historicalMessages: ChatMessage[] = [];
          // data.history is newest first, reverse to display chronologically (oldest to newest)
          const reversed = [...data.history].reverse();
          reversed.forEach((item, idx) => {
            historicalMessages.push({
              id: `hist-user-${idx}`,
              sender: 'user',
              text: item.question,
              timestamp: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
            historicalMessages.push({
              id: `hist-ai-${idx}`,
              sender: 'ai',
              text: item.answer,
              timestamp: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
          });

          setMessages(prev => [
            prev[0], // Keep welcome message at the top
            ...historicalMessages
          ]);
        }
      } catch (err) {
        console.error('Failed to load chat history into stream', err);
      }
    };

    loadChatHistoryIntoStream();
  }, [token]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryToSend?: string) => {
    const question = (queryToSend || inputQuery).trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (data.success) {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.officialAnswer || data.answer || data.fullTextAnswer || '',
          nextSteps: data.nextSteps,
          sources: (data.sources || []).filter((s: SourceCitation) => s.type === 'official' || !s.type),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          groundingStatus: data.groundingStatus,
          modelUsed: data.modelUsed,
          latencyMs: data.latencyMs,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          sender: 'ai',
          text: data.error || "Sorry, I couldn't process that question right now.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'ai',
        text: "Sorry, I couldn't process that question right now. Please check your connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center tracking-tight shadow-xs">
            CAI
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-900 leading-tight">Campus AI</h1>
              <span className="hidden sm:inline-block text-[11px] text-slate-400 font-normal">
                Your university, explained.
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Tools & User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Admin/Editor Switch Button */}
          {(user.role === 'admin' || user.role === 'editor') && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              title="Open Source Documents Manager"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{user.role === 'editor' ? 'Editor Console' : 'Admin Panel'}</span>
              <span className="sm:hidden">Console</span>
            </button>
          )}

          {/* User Info */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-full text-xs max-w-[120px] sm:max-w-none truncate">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
              {user.name.charAt(0)}
            </span>
            <span className="font-medium text-slate-700 truncate">{user.name}</span>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Suggested Demonstration Prompt Bar */}
      <div className="bg-white border-b border-slate-200/80 px-3 sm:px-4 py-2 flex items-center gap-2 shrink-0 overflow-x-auto touch-pan-x scrollbar-none">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-blue-500" />
          <span className="hidden sm:inline">Quick Prompts:</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
          {PITCH_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt.query)}
              disabled={isLoading}
              className="px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 border border-slate-200 transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 min-h-[32px] flex items-center"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Stream */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 overscroll-contain">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onViewSource={(source) => setSelectedSource(source)}
            />
          ))}

          {/* Shimmering Skeleton Loading UI */}
          {isLoading && (
            <div className="flex gap-3 mb-6 items-start">
              <div className="w-8 h-8 rounded-lg bg-blue-100/50 flex items-center justify-center shrink-0 border border-blue-200/50">
                 <div className="w-4 h-4 bg-blue-300/50 rounded-full animate-pulse" />
              </div>
              <div className="flex-1 max-w-[85%] space-y-3">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-5 shadow-2xs space-y-4">
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-slate-300 animate-pulse" />
                    <div className="h-2.5 bg-slate-200/80 rounded-full w-40 animate-pulse"></div>
                  </div>
                  
                  {/* Paragraph skeleton */}
                  <div className="space-y-2.5">
                    <div className="h-2.5 bg-slate-200/80 rounded-full w-full animate-pulse"></div>
                    <div className="h-2.5 bg-slate-200/80 rounded-full w-[92%] animate-pulse"></div>
                    <div className="h-2.5 bg-slate-200/80 rounded-full w-[78%] animate-pulse"></div>
                  </div>
                  
                  {/* Bullet points skeleton */}
                  <div className="pt-2 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200/80 animate-pulse shrink-0"></div>
                      <div className="h-2.5 bg-slate-200/80 rounded-full w-[65%] animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200/80 animate-pulse shrink-0"></div>
                      <div className="h-2.5 bg-slate-200/80 rounded-full w-[45%] animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Chat Input Bar */}
      <footer className="bg-white border-t border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-1.5 sm:gap-2 bg-slate-50 border border-slate-300 rounded-2xl p-1.5 sm:p-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/10 transition-all"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about university rules, admissions, hostels, exams..."
              className="flex-1 max-h-32 bg-transparent resize-none border-none outline-none text-base sm:text-sm text-slate-900 placeholder:text-slate-400 px-2 py-1.5 font-normal"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="min-w-[42px] min-h-[42px] p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
              title="Send Message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-2">
            <span>Grounded in official university handbooks & guidelines</span>
            <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </footer>

      {/* Source Citation Snippet Modal */}
      <SourceModal
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
};
