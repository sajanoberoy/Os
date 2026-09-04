const fs = require('fs');

let code = fs.readFileSync('server/rag/indexer.ts', 'utf8');

const newIndexerCode = `  public async reindexAll(): Promise<{ chunksCount: number; documentsCount: number }> {
    console.log('[RAG Indexer] Starting ingestion and indexing process...');
    const allChunks: DocumentChunk[] = [];
    let docCount = 0;

    // 1. Process official documents from local files
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
      }
    } catch (err) {
      console.error('[RAG Indexer] Failed to fetch documents from local FS:', err);
    }`;

const startIndex = code.indexOf('  public async reindexAll(): Promise<{ chunksCount: number; documentsCount: number }> {');
const endIndex = code.indexOf('    // 2. Process student experiences');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newIndexerCode + '\n\n' + code.substring(endIndex);
  code = code.replace("import { db } from '../firebase.js';", "");
  code = code.replace("import { collection, getDocs } from 'firebase/firestore';", "");
  
  fs.writeFileSync('server/rag/indexer.ts', code);
  console.log("Indexer updated");
} else {
  console.log("Could not find start or end index");
}
