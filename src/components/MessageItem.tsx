import React from 'react';
import Markdown from 'react-markdown';
import { CheckCircle2, FileText, ChevronRight } from 'lucide-react';
import { ChatMessage, SourceCitation } from '../types';

interface MessageItemProps {
  message: ChatMessage;
  onViewSource?: (source: SourceCitation) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onViewSource }) => {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs text-sm font-medium leading-relaxed">
          {message.text}
        </div>
      </div>
    );
  }

  // AI Message - single coherent chat response
  const displayText = message.officialAnswer || message.text;
  const hasNextSteps = Boolean(message.nextSteps && message.nextSteps.length > 0);
  const hasSources = Boolean(message.sources && message.sources.length > 0);

  return (
    <div className="flex gap-3 mb-6 items-start">
      {/* AI Avatar */}
      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs mt-0.5">
        AI
      </div>

      <div className="flex-1 max-w-[90%] space-y-3">
        {/* Main Grounded Chat Bubble with Markdown formatting */}
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-2xs text-slate-800 text-sm leading-relaxed">
          <div className="-sm-slate max-w-none space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:text-slate-900 [&_strong]:font-semibold">
            <Markdown>{displayText}</Markdown>
          </div>
        </div>

        {/* Actionable Next Steps */}
        {hasNextSteps && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Recommended Next Steps</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {message.nextSteps!.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Verified Ground-Truth Source Citations */}
        {hasSources && (
          <div className="pt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Sources:
            </span>
            {message.sources!.map((source, sIdx) => (
              <button
                key={sIdx}
                onClick={() => onViewSource && onViewSource(source)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all hover:shadow-2xs cursor-pointer"
                title="Click to inspect raw source snippet"
              >
                <FileText className="w-3 h-3 text-blue-600 opacity-80" />
                <span>
                  {source.title} {source.pageOrSection ? `• ${source.pageOrSection}` : ''}
                </span>
                <ChevronRight className="w-2.5 h-2.5 opacity-50" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
