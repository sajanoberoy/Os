const fs = require('fs');

let content = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');

if (!content.includes('DarkModeToggle')) {
  content = content.replace("import { motion } from 'motion/react';", "import { motion } from 'motion/react';\nimport { DarkModeToggle } from './DarkModeToggle';");
}

// Update the container
content = content.replace(
  '<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-100">',
  '<div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 selection:bg-blue-100 dark:selection:bg-blue-900/50 relative">'
);

// Add the toggle to the top right of the container
content = content.replace(
  '<div className="w-full max-w-md">',
  '<div className="absolute top-4 right-4"><DarkModeToggle /></div>\n      <div className="w-full max-w-md">'
);

// Update motion.div card
content = content.replace(
  'className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 relative overflow-hidden"',
  'className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 relative overflow-hidden"'
);

// Update text colors
content = content.replace(/text-slate-900/g, 'text-slate-900 dark:text-white');
content = content.replace(/text-slate-700/g, 'text-slate-700 dark:text-slate-200');
content = content.replace(/text-slate-600/g, 'text-slate-600 dark:text-slate-400');
content = content.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-400');
content = content.replace(/text-slate-400/g, 'text-slate-400 dark:text-slate-500');

// Update Role Selector Tabs
content = content.replace(
  'bg-slate-100 rounded-xl',
  'bg-slate-100 dark:bg-slate-900/50 rounded-xl'
);
content = content.replace(
  "? 'bg-slate-900 text-white shadow-xs'",
  "? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'"
);
// Hover on tabs
content = content.replace(
  ": 'text-slate-600 hover:text-slate-900 dark:text-white'",
  ": 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
);

// Update Verification Box
content = content.replace(
  'bg-blue-50/50 border border-blue-100',
  'bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30'
);
content = content.replace(
  'text-blue-800',
  'text-blue-800 dark:text-blue-300'
);
// Notice box
content = content.replace(
  'bg-amber-50 border border-amber-200',
  'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30'
);
content = content.replace(
  'text-amber-900',
  'text-amber-900 dark:text-amber-200'
);

// Inputs
content = content.replace(
  /bg-slate-50 border border-slate-200/g,
  'bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700'
);
content = content.replace(
  /bg-white border border-slate-200/g,
  'bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700'
);

// Admin submit button
content = content.replace(
  "? 'bg-slate-900 hover:bg-slate-800'",
  "? 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 border border-transparent dark:border-slate-600'"
);

fs.writeFileSync('src/components/LoginScreen.tsx', content);
