export interface DocumentChunk {
  id: string;
  title: string;
  source: string;
  pageOrSection: string;
  type: 'official' | 'experience';
  content: string;
  tags?: string[];
}

export interface StudentExperience {
  id: string;
  topic: string;
  question: string;
  experience: string;
  tags: string[];
  source: string;
  type: 'experience';
  verifiedBySeniors?: boolean;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export interface RAGRetrievalResult {
  officialChunks: SearchResult[];
  experienceChunks: SearchResult[];
  query: string;
}

export interface SourceCitation {
  id: string;
  title: string;
  pageOrSection: string;
  type: 'official' | 'experience';
  snippet: string;
  relevanceScore: number;
}

export interface ChatResponsePayload {
  success: boolean;
  question: string;
  officialAnswer: string;
  studentExperience?: string;
  nextSteps: string[];
  fullTextAnswer: string;
  sources: SourceCitation[];
  groundingStatus: 'fully_grounded' | 'partially_grounded' | 'no_official_source';
  timestamp: string;
  latencyMs: number;
  modelUsed: string;
}
