import React from 'react';
import { X, BookOpen, Users, ShieldCheck } from 'lucide-react';
import { SourceCitation } from '../types';

interface SourceModalProps {
  source: SourceCitation | null;
  onClose: () => void;
}

export const SourceModal: React.FC<SourceModalProps> = ({ source, onClose }) => {
  if (!source) return null;

  const isOfficial = source.type === 'official';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 rounded-xl ${isOfficial ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {isOfficial ? <BookOpen className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">{source.title}</h3>
            <p className="text-xs text-slate-500">{source.pageOrSection} • {isOfficial ? 'Official University Document' : 'Student Community Network'}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Retrieved Document Excerpt
          </span>
          <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
            {source.snippet}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Relevance Match: {Math.round(source.relevanceScore * 100)}%</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
