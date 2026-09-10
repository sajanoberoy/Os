const fs = require('fs');

let content = fs.readFileSync('src/components/SourceModal.tsx', 'utf8');

// Overlay
content = content.replace(
  'className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"',
  'className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-900/70 backdrop-blur-sm"'
);

// Modal container
content = content.replace(
  'className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"',
  'className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-transparent dark:border-slate-700"'
);

// Header
content = content.replace(
  'className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50"',
  'className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"'
);
content = content.replace(
  'className="text-sm font-bold text-slate-800 flex items-center gap-2"',
  'className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"'
);
content = content.replace(
  'className="text-blue-600"',
  'className="text-blue-600 dark:text-blue-400"'
);

// Content body
content = content.replace(
  'className="p-5 overflow-y-auto bg-slate-50 flex-1"',
  'className="p-5 overflow-y-auto bg-slate-50 dark:bg-slate-900/30 flex-1"'
);
content = content.replace(
  'className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"',
  'className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm"'
);
content = content.replace(
  'className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100"',
  'className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700"'
);
content = content.replace(
  'className="text-xs font-bold text-slate-500 uppercase tracking-wider"',
  'className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"'
);
content = content.replace(
  'className="text-xs text-slate-400"',
  'className="text-xs text-slate-400 dark:text-slate-500"'
);
content = content.replace(
  'className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap"',
  'className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap"'
);

// Footer
content = content.replace(
  'className="p-4 border-t border-slate-100 bg-white"',
  'className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"'
);
content = content.replace(
  'className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"',
  'className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-colors cursor-pointer"'
);

fs.writeFileSync('src/components/SourceModal.tsx', content);
