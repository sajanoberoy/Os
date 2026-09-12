import { DocumentChunk, RAGRetrievalResult, SearchResult } from '../types.js';
import { ragIndexer, StoredEmbedding } from './indexer.js';

function cosineSimilarity(vecA: number[], normA: number, vecB: number[], normB: number): number {
  if (normA === 0 || normB === 0) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    if (vecA[i] > 0 && vecB[i] > 0) {
      dotProduct += vecA[i] * vecB[i];
    }
  }
  return dotProduct / (normA * normB);
}

function calculateQueryVector(query: string, vocab: string[]): { vector: number[]; norm: number } {
  const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const counts: Record<string, number> = {};
  for (const w of words) {
    counts[w] = (counts[w] || 0) + 1;
  }

  const vector = vocab.map(v => {
    const tf = counts[v] || 0;
    return tf > 0 ? 1 + Math.log(tf) : 0;
  });

  const sum = vector.reduce((acc, val) => acc + val * val, 0);
  const norm = Math.sqrt(sum) || 1;

  return { vector, norm };
}

export class RAGSearcher {
  public async search(query: string, topOfficial: number = 6, topExperience: number = 2): Promise<RAGRetrievalResult> {
    await ragIndexer.initialize();
    
    const chunks = ragIndexer.getChunks();
    const embeddings = ragIndexer.getEmbeddings();
    const vocab = ragIndexer.getVocabulary();

    const { vector: queryVec, norm: queryNorm } = calculateQueryVector(query, vocab);
    const queryLower = query.toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 2);

    const embedMap = new Map<string, StoredEmbedding>();
    for (const emb of embeddings) {
      embedMap.set(emb.chunkId, emb);
    }

    const scoredChunks: SearchResult[] = [];

    for (const chunk of chunks) {
      const emb = embedMap.get(chunk.id);
      let sim = 0;
      if (emb) {
        sim = cosineSimilarity(queryVec, queryNorm, emb.vector, emb.norm);
      }

      const contentLower = chunk.content.toLowerCase();
      const titleLower = (chunk.title || '').toLowerCase();
      const sourceLower = (chunk.source || '').toLowerCase();

      let keywordBoost = 0;

      // Check full query phrase presence
      if (queryLower.length > 3 && (contentLower.includes(queryLower) || titleLower.includes(queryLower))) {
        keywordBoost += 0.45;
      }

      // Check individual query tokens
      let matchedTokens = 0;
      for (const token of queryTokens) {
        if (contentLower.includes(token) || titleLower.includes(token) || sourceLower.includes(token)) {
          matchedTokens++;
          keywordBoost += 0.15;
        }
      }

      // Proportional token coverage boost
      if (queryTokens.length > 0 && matchedTokens > 0) {
        const coverageRatio = matchedTokens / queryTokens.length;
        keywordBoost += coverageRatio * 0.35;
      }

      // Check tags
      if (chunk.tags) {
        for (const tag of chunk.tags) {
          if (queryLower.includes(tag.toLowerCase())) {
            keywordBoost += 0.25;
          }
        }
      }

      const finalScore = Math.min(1.0, sim * 0.45 + keywordBoost);

      if (finalScore > 0.03 || matchedTokens > 0) {
        scoredChunks.push({
          chunk,
          score: Math.round(finalScore * 100) / 100,
        });
      }
    }

    // Sort by relevance score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    // If fewer than topOfficial chunks passed threshold, ensure we include top chunks as broad context so chatbot always has knowledge
    if (scoredChunks.length < topOfficial && chunks.length > 0) {
      const existingIds = new Set(scoredChunks.map(sc => sc.chunk.id));
      for (const chunk of chunks) {
        if (!existingIds.has(chunk.id) && scoredChunks.length < topOfficial) {
          scoredChunks.push({
            chunk,
            score: 0.15,
          });
        }
      }
    }

    const officialChunks = scoredChunks
      .filter(sc => sc.chunk.type === 'official')
      .slice(0, topOfficial);

    const experienceChunks = scoredChunks
      .filter(sc => sc.chunk.type === 'experience')
      .slice(0, topExperience);

    return {
      officialChunks,
      experienceChunks,
      query,
    };
  }
}

export const ragSearcher = new RAGSearcher();
