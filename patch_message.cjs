const fs = require('fs');

let content = fs.readFileSync('src/components/MessageItem.tsx', 'utf8');

// Container
content = content.replace(
  'className={`flex gap-3 max-w-3xl mx-auto ${isAi ? \'\' : \'flex-row-reverse\'}`}',
  'className={`flex gap-3 max-w-3xl mx-auto ${isAi ? \'\' : \'flex-row-reverse\'}`}'
);

// Bubbles
content = content.replace(
  "className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${isAi ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}",
  "className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${isAi ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}"
);

// Bubble container
content = content.replace(
  "className={`rounded-2xl px-4 py-3 shadow-sm relative overflow-hidden ${isAi ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'}`}",
  "className={`rounded-2xl px-4 py-3 shadow-sm relative overflow-hidden ${isAi ? 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm' : 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-sm'}`}"
);

// Timestamp
content = content.replace(
  "className={`text-[10px] font-semibold flex items-center gap-1.5 mb-1 ${isAi ? 'text-slate-400' : 'text-blue-200 justify-end'}`}",
  "className={`text-[10px] font-semibold flex items-center gap-1.5 mb-1 ${isAi ? 'text-slate-400 dark:text-slate-500' : 'text-blue-200 dark:text-blue-300 justify-end'}`}"
);

// Next Steps
content = content.replace(
  "className=\"mt-3 pt-3 border-t border-slate-100 space-y-2\"",
  "className=\"mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2\""
);
content = content.replace(
  "className=\"text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1\"",
  "className=\"text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1\""
);
content = content.replace(
  "className=\"text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex items-start gap-2\"",
  "className=\"text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700 flex items-start gap-2\""
);
content = content.replace(
  /text-blue-500/g,
  "text-blue-500 dark:text-blue-400"
);

// Citations
content = content.replace(
  "className=\"mt-4 pt-3 border-t border-slate-100\"",
  "className=\"mt-4 pt-3 border-t border-slate-100 dark:border-slate-700\""
);
content = content.replace(
  "className=\"text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5\"",
  "className=\"text-xs font-bold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5\""
);
content = content.replace(
  "className=\"text-blue-600\"",
  "className=\"text-blue-600 dark:text-blue-400\""
);
content = content.replace(
  "className=\"w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg p-2.5 transition-colors cursor-pointer group\"",
  "className=\"w-full text-left bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-800/30 rounded-lg p-2.5 transition-colors cursor-pointer group\""
);
content = content.replace(
  "className=\"text-xs font-bold text-blue-900 group-hover:text-blue-700 line-clamp-1 mb-0.5\"",
  "className=\"text-xs font-bold text-blue-900 dark:text-blue-300 group-hover:text-blue-700 dark:group-hover:text-blue-200 line-clamp-1 mb-0.5\""
);
content = content.replace(
  "className=\"text-[11px] text-blue-600/80 line-clamp-2\"",
  "className=\"text-[11px] text-blue-600/80 dark:text-blue-400/80 line-clamp-2\""
);

// Markdown body adjustments (if handled mostly by css, we can leave it or wrap in a div)
content = content.replace(
  '<div className="markdown-body text-sm leading-relaxed whitespace-pre-wrap font-medium">',
  '<div className="markdown-body text-sm leading-relaxed whitespace-pre-wrap font-medium prose dark:prose-invert max-w-none">'
);

fs.writeFileSync('src/components/MessageItem.tsx', content);
