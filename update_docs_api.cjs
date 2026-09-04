const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const newDocsApi = `  // 1. Admin: List all source documents
  app.get('/api/admin/documents', requireAdmin, async (req, res) => {
    try {
      const allChunks = ragIndexer.getChunks();
      const documentList = [];
      const dirPath = path.join(process.cwd(), 'data', 'documents');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith('.txt') && !file.endsWith('.md') && !file.endsWith('.json')) continue;
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        const title = file.replace(/\\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase();
        const docChunks = allChunks.filter(c => c.id.startsWith(file.replace(/[^a-zA-Z0-9]/g, '_')));
        
        documentList.push({
          filename: file,
          title,
          sizeBytes: Buffer.byteLength(content, 'utf8'),
          linesCount: content.split('\\n').length,
          modifiedAt: stats.mtime.toISOString(),
          chunkCount: docChunks.length > 0 ? docChunks.length : Math.max(1, Math.ceil(content.length / 800)),
          preview: content.slice(0, 240) + (content.length > 240 ? '...' : ''),
        });
      }

      res.json({
        success: true,
        documents: documentList,
        totalDocuments: documentList.length,
        totalChunks: allChunks.length,
      });
    } catch (err) {
      console.error('[Admin] Error listing documents:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Admin: Get specific document content
  app.get('/api/admin/documents/:filename', requireAdmin, async (req, res) => {
    try {
      const filename = sanitizeFileName(req.params.filename);
      const filePath = path.join(process.cwd(), 'data', 'documents', filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: \`Document '\${filename}' not found.\` });
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      
      res.json({
        success: true,
        filename,
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
        modifiedAt: stats.mtime.toISOString(),
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Admin: Create new document / file
  app.post('/api/admin/documents', requireAdmin, async (req, res) => {
    try {
      const { filename, content } = req.body;
      if (!filename || typeof filename !== 'string' || !filename.trim()) {
        return res.status(400).json({ success: false, error: 'Valid filename is required.' });
      }
      if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Document content is required.' });
      }

      const cleanFilename = sanitizeFileName(filename.trim());
      const dirPath = path.join(process.cwd(), 'data', 'documents');
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      
      const filePath = path.join(dirPath, cleanFilename);
      fs.writeFileSync(filePath, content, 'utf8');

      // Auto reindex after adding
      const reindexStats = await ragIndexer.reindexAll();

      res.json({
        success: true,
        message: \`Document '\${cleanFilename}' saved and indexed successfully.\`,
        filename: cleanFilename,
        reindexStats,
      });
    } catch (err) {
      console.error('[Admin] Error creating document:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Admin: Update existing document
  app.put('/api/admin/documents/:filename', requireAdmin, async (req, res) => {
    try {
      const oldFilename = sanitizeFileName(req.params.filename);
      const { content, newFilename } = req.body;
      const dirPath = path.join(process.cwd(), 'data', 'documents');
      const oldFilePath = path.join(dirPath, oldFilename);
      
      if (!fs.existsSync(oldFilePath)) {
        return res.status(404).json({ success: false, error: \`Document '\${oldFilename}' does not exist.\` });
      }
      if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Content must be provided.' });
      }

      let finalFilename = oldFilename;
      if (newFilename && typeof newFilename === 'string' && newFilename.trim()) {
        const cleanNew = sanitizeFileName(newFilename.trim());
        if (cleanNew !== oldFilename) {
          fs.unlinkSync(oldFilePath);
          finalFilename = cleanNew;
        }
      }

      const newFilePath = path.join(dirPath, finalFilename);
      fs.writeFileSync(newFilePath, content, 'utf8');

      // Auto re-index
      const reindexStats = await ragIndexer.reindexAll();

      res.json({
        success: true,
        message: \`Document '\${finalFilename}' updated and re-indexed.\`,
        filename: finalFilename,
        reindexStats,
      });
    } catch (err) {
      console.error('[Admin] Error updating document:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Admin: Delete document
  app.delete('/api/admin/documents/:filename', requireAdmin, async (req, res) => {
    try {
      const filename = sanitizeFileName(req.params.filename);
      const filePath = path.join(process.cwd(), 'data', 'documents', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: \`Document '\${filename}' not found.\` });
      }
      
      fs.unlinkSync(filePath);

      // Auto reindex
      const reindexStats = await ragIndexer.reindexAll();

      res.json({
        success: true,
        message: \`Document '\${filename}' deleted and knowledge base refreshed.\`,
        reindexStats,
      });
    } catch (err) {
      console.error('[Admin] Error deleting document:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });`;

const startIndex = code.indexOf('  // 1. Admin: List all source documents');
const endIndex = code.indexOf('  // 6. Admin: Force Reindex');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newDocsApi + '\n\n' + code.substring(endIndex);
  fs.writeFileSync('server.ts', code);
  console.log("Documents API replaced");
} else {
  console.log("Could not find start or end index");
}
