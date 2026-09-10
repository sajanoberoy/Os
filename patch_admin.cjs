const fs = require('fs');

let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Global Container
content = content.replace(
  '<div className="min-h-screen bg-slate-50 font-sans">',
  '<div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-200">'
);

// Header
content = content.replace(
  '<header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 sticky top-0 z-20">',
  '<header className="bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 dark:border-slate-800 px-6 py-4 sticky top-0 z-20 transition-colors">'
);

if (!content.includes('DarkModeToggle')) {
  content = content.replace(
    "import { SourceModal } from './SourceModal';",
    "import { SourceModal } from './SourceModal';\nimport { DarkModeToggle } from './DarkModeToggle';"
  );
}

// Header buttons (Logout + Switch) + DarkModeToggle
content = content.replace(
  '<button\n              onClick={onSwitchToChat}',
  '<DarkModeToggle />\n            <button\n              onClick={onSwitchToChat}'
);
content = content.replace(
  'className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"',
  'className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"'
);

// Main Content Headers
content = content.replace(
  'className="text-2xl font-bold text-slate-900 tracking-tight"',
  'className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight"'
);
content = content.replace(
  'className="text-sm font-medium text-slate-500 mt-1"',
  'className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1"'
);

// Summary Cards
content = content.replace(
  /bg-white border border-slate-200/g,
  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
);
content = content.replace(
  /text-slate-900/g,
  'text-slate-900 dark:text-white'
);
content = content.replace(
  /text-slate-500/g,
  'text-slate-500 dark:text-slate-400'
);
content = content.replace(
  /text-slate-600/g,
  'text-slate-600 dark:text-slate-300'
);

// File Upload Area
content = content.replace(
  'className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-8 text-center"',
  'className="border-2 border-dashed border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-8 text-center"'
);
content = content.replace(
  'className="text-sm font-semibold text-blue-900 mb-1"',
  'className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1"'
);
content = content.replace(
  'className="text-xs text-blue-600/70 mb-4"',
  'className="text-xs text-blue-600/70 dark:text-blue-400/70 mb-4"'
);

// Uploading states
content = content.replace(
  'bg-blue-50 border border-blue-100',
  'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30'
);
content = content.replace(
  'bg-amber-50 border border-amber-200 text-amber-800',
  'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-200'
);
content = content.replace(
  'bg-green-50 border border-green-200 text-green-800',
  'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-800 dark:text-green-200'
);
content = content.replace(
  'bg-red-50 border border-red-200 text-red-700',
  'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-200'
);

// Search Bar
content = content.replace(
  'bg-slate-50 border border-slate-200',
  'bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700'
);

// Document List Items
content = content.replace(
  'bg-slate-50 hover:bg-slate-100 border border-slate-200',
  'bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900/70 border border-slate-200 dark:border-slate-700'
);

// Badges
content = content.replace(
  'bg-blue-100 text-blue-800',
  'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
);

// Chat Logs Section
content = content.replace(
  'bg-slate-50 rounded-xl p-4 border border-slate-100',
  'bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700'
);

// Modals... this might be handled automatically if we patch SourceModal.tsx or we replace global strings

fs.writeFileSync('src/components/AdminPanel.tsx', content);
