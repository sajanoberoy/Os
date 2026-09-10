const fs = require('fs');

let content = fs.readFileSync('src/components/ChatScreen.tsx', 'utf8');

if (!content.includes('DarkModeToggle')) {
  content = content.replace(
    "import { SourceModal } from './SourceModal';",
    "import { SourceModal } from './SourceModal';\nimport { DarkModeToggle } from './DarkModeToggle';"
  );
}

// Global layout container
content = content.replace(
  '<div className="h-screen bg-slate-50 flex flex-col font-sans">',
  '<div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-200">'
);

// Header
content = content.replace(
  '<header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between z-10 shrink-0">',
  '<header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sm:px-6 flex items-center justify-between z-10 shrink-0 transition-colors">'
);

// Add DarkModeToggle next to logout button in header
content = content.replace(
  '<button\n            onClick={onLogout}',
  '<DarkModeToggle />\n          <button\n            onClick={onLogout}'
);

// Header texts
content = content.replace(
  'className="font-bold text-slate-800 tracking-tight"',
  'className="font-bold text-slate-800 dark:text-slate-100 tracking-tight"'
);
content = content.replace(
  'className="text-xs font-semibold text-slate-500"',
  'className="text-xs font-semibold text-slate-500 dark:text-slate-400"'
);

// PITCH PROMPTS container
content = content.replace(
  '<div className="flex gap-2 p-4 bg-white border-b border-slate-100 overflow-x-auto snap-x scrollbar-hide shrink-0">',
  '<div className="flex gap-2 p-4 bg-white dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 overflow-x-auto snap-x scrollbar-hide shrink-0">'
);
content = content.replace(
  'className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"',
  'className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-800/50 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"'
);

// Footer (Input container)
content = content.replace(
  '<div className="bg-white border-t border-slate-200 p-4 shrink-0">',
  '<div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shrink-0 transition-colors">'
);
content = content.replace(
  '<div className="max-w-3xl mx-auto flex gap-2">',
  '<div className="max-w-3xl mx-auto flex gap-2">' // nothing
);
content = content.replace(
  'bg-slate-50 border border-slate-200 text-slate-900',
  'bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
);

// Helper texts
content = content.replace(
  'text-[10px] text-center text-slate-400 mt-3 font-medium',
  'text-[10px] text-center text-slate-400 dark:text-slate-500 mt-3 font-medium'
);

// Admin Button
content = content.replace(
  'className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"',
  'className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"'
);

// Logout button
content = content.replace(
  'className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"',
  'className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"'
);

fs.writeFileSync('src/components/ChatScreen.tsx', content);
