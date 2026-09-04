import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { DocumentChunk, StudentExperience } from '../types.js';
import { db, collection, getDocs } from '../firebase.js';

const EXPERIENCES_FILE = path.join(process.cwd(), 'data', 'experiences', 'student_experiences.json');
const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');
const CHUNKS_FILE = path.join(PROCESSED_DIR, 'chunks.json');
const EMBEDDINGS_FILE = path.join(PROCESSED_DIR, 'embeddings.json');

// Ensure directory exists
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

export interface StoredEmbedding {
  chunkId: string;
  vector: number[];
  norm: number;
}

// Generate TF-IDF/BM25 style vector for ultra-fast local keyword similarity
function generateLocalVector(text: string, vocab: string[]): number[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const counts: Record<string, number> = {};
  for (const w of words) {
    counts[w] = (counts[w] || 0) + 1;
  }
  
  return vocab.map(v => {
    const tf = counts[v] || 0;
    return tf > 0 ? 1 + Math.log(tf) : 0;
  });
}

function calculateNorm(v: number[]): number {
  const sum = v.reduce((acc, val) => acc + val * val, 0);
  return Math.sqrt(sum) || 1;
}

export class RAGIndexer {
  private chunks: DocumentChunk[] = [];
  private embeddings: StoredEmbedding[] = [];
  private vocabulary: string[] = [];
  private aiClient: GoogleGenAI | null = null;
  private isInitialized = false;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (fs.existsSync(CHUNKS_FILE) && fs.existsSync(EMBEDDINGS_FILE)) {
      try {
        const rawChunks = fs.readFileSync(CHUNKS_FILE, 'utf-8');
        const rawEmbeds = fs.readFileSync(EMBEDDINGS_FILE, 'utf-8');
        this.chunks = JSON.parse(rawChunks);
        const embedData = JSON.parse(rawEmbeds);
        this.embeddings = embedData.embeddings || [];
        this.vocabulary = embedData.vocabulary || [];
        this.isInitialized = true;
        console.log(`[RAG Indexer] Loaded ${this.chunks.length} cached chunks and ${this.embeddings.length} embeddings.`);
        return;
      } catch (err) {
        console.warn('[RAG Indexer] Error reading cached index, rebuilding...', err);
      }
    }

    await this.reindexAll();
  }

  public async reindexAll(): Promise<{ chunksCount: number; documentsCount: number }> {
    console.log('[RAG Indexer] Starting ingestion and indexing process...');
    const allChunks: DocumentChunk[] = [];
    let docCount = 0;

    // 1. Process official documents from Firestore (with local fallback)
    let fetchedFromFirestore = false;
    if (db) {
      try {
        const docsSnapshot = await getDocs(collection(db, 'documents'));
        docsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.content && data.filename) {
            docCount++;
            const docChunks = this.parseDocumentIntoChunks(data.filename, data.content);
            allChunks.push(...docChunks);
            fetchedFromFirestore = true;
          }
        });
      } catch (err) {
        console.error('[RAG Indexer] Error fetching documents from Firestore:', err);
      }
    }

    // Fallback to local files if Firestore returned no documents or was unreachable
    if (!fetchedFromFirestore || allChunks.length === 0) {
      try {
        const dirPath = path.join(process.cwd(), 'data', 'documents');
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            if (!file.endsWith('.txt') && !file.endsWith('.md') && !file.endsWith('.json')) continue;
            docCount++;
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const docChunks = this.parseDocumentIntoChunks(file, content);
            allChunks.push(...docChunks);
          }
          console.log(`[RAG Indexer] Loaded ${allChunks.length} chunks from local fallback files.`);
        }
      } catch (err) {
        console.error('[RAG Indexer] Error reading local fallback documents:', err);
      }
    }

    // 2. Process student experiences
    if (fs.existsSync(EXPERIENCES_FILE)) {
      try {
        const raw = fs.readFileSync(EXPERIENCES_FILE, 'utf-8');
        const experiences: StudentExperience[] = JSON.parse(raw);
        for (const exp of experiences) {
          allChunks.push({
            id: exp.id,
            title: exp.topic,
            source: exp.source,
            pageOrSection: 'Student Experience Dataset',
            type: 'experience',
            content: `Experience: ${exp.experience}\nQuestion: ${exp.question}`
          });
        }
        console.log(`[RAG Indexer] Indexed ${experiences.length} student experiences.`);
      } catch (err) {
        console.error('[RAG Indexer] Error reading experiences file:', err);
      }
    }

    this.chunks = allChunks;
    await this.generateEmbeddings();

    this.isInitialized = true;
    console.log(`[RAG Indexer] Reindex complete. Total chunks: ${this.chunks.length}`);
    return {
      chunksCount: this.chunks.length,
      documentsCount: docCount
    };
  }

  private parseDocumentIntoChunks(filename: string, content: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    let sections = content.split(/\n(?=#+\s)|\n(?=\d+\.\s)|\n\n/);
    if (sections.length === 1) {
      sections = content.match(/.{1,800}(?:\s|$)/g) || [content];
    }
    
    sections = sections.map(s => s.trim()).filter(s => s.length > 50);
    
    sections.forEach((section, index) => {
      chunks.push({
        id: `${filename.replace(/[^a-zA-Z0-9]/g, '_')}_chunk_${index}`,
        title: filename.replace(/\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase(),
        source: filename,
        pageOrSection: `Section ${index + 1}`,
        type: 'official',
        content: section
      });
    });
    
    return chunks;
  }

  private async generateEmbeddings(): Promise<void> {
    console.log('[RAG Indexer] Building mathematical TF-IDF vocabulary...');
    
    const wordCounts: Record<string, number> = {};
    for (const chunk of this.chunks) {
      const words = chunk.content.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      for (const w of words) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    }
    
    this.vocabulary = Object.entries(wordCounts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5000)
      .map(entry => entry[0]);

    this.embeddings = this.chunks.map(chunk => {
      const vector = generateLocalVector(chunk.content, this.vocabulary);
      return {
        chunkId: chunk.id,
        vector,
        norm: calculateNorm(vector)
      };
    });

    fs.writeFileSync(CHUNKS_FILE, JSON.stringify(this.chunks, null, 2));
    fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify({
      vocabulary: this.vocabulary,
      embeddings: this.embeddings
    }, null, 2));
  }

  public getChunks(): DocumentChunk[] {
    return this.chunks;
  }

  public getVocabulary(): string[] {
    return this.vocabulary;
  }

  public getEmbeddings(): StoredEmbedding[] {
    return this.embeddings;
  }
}

export const ragIndexer = new RAGIndexer();
