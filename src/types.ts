export interface SourceCitation {
  id: string;
  title: string;
  pageOrSection: string;
  type: 'official' | 'experience';
  snippet: string;
  relevanceScore: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  officialAnswer?: string;
  studentExperience?: string;
  nextSteps?: string[];
  sources?: SourceCitation[];
  timestamp: string;
  groundingStatus?: 'fully_grounded' | 'partially_grounded' | 'no_official_source';
  modelUsed?: string;
  latencyMs?: number;
}

export interface UserProfile {
  email: string;
  name: string;
  role: 'student' | 'demo' | 'admin' | string;
}

export interface AdminDocument {
  filename: string;
  title: string;
  sizeBytes: number;
  linesCount: number;
  modifiedAt: string;
  chunkCount: number;
  preview: string;
}

export interface DocumentInfo {
  name: string;
  title: string;
  sizeBytes: number;
  summary: string;
}

export interface ExperienceInfo {
  id: string;
  topic: string;
  question: string;
  experience: string;
  source: string;
  tags: string[];
}
