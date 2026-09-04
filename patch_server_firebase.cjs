const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const newApiBlock = `  // 1. Admin: List all source documents
  app.get('/api/admin/documents', requireAdmin, async (req, res) => {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      const docsSnapshot = await getDocs(collection(db, 'documents'));
      const allChunks = ragIndexer.getChunks();
      
      const documentList = [];
      docsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.filename && data.content) {
          const title = data.filename.replace(/\\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase();
          const docChunks = allChunks.filter(c => c.id.startsWith(data.filename.replace(/[^a-zA-Z0-9]/g, '_')));
          
          documentList.push({
            filename: data.filename,
            title,
            sizeBytes: Buffer.byteLength(data.content, 'utf8'),
            linesCount: data.content.split('\\n').length,
            modifiedAt: data.updatedAt || new Date().toISOString(),
            chunkCount: docChunks.length > 0 ? docChunks.length : Math.max(1, Math.ceil(data.content.length / 800)),
            preview: data.content.slice(0, 240) + (data.content.length > 240 ? '...' : ''),
          });
        }
      });

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
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      const filename = sanitizeFileName(req.params.filename);
      const docRef = doc(db, 'documents', filename);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return res.status(404).json({ success: false, error: \`Document '\${filename}' not found.\` });
      }
      
      const data = docSnap.data();
      res.json({
        success: true,
        filename,
        content: data.content,
        sizeBytes: Buffer.byteLength(data.content, 'utf8'),
        modifiedAt: data.updatedAt || new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Admin: Create new document / file
  app.post('/api/admin/documents', requireAdmin, async (req, res) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      const { filename, content } = req.body;
      if (!filename || typeof filename !== 'string' || !filename.trim()) {
        return res.status(400).json({ success: false, error: 'Valid filename is required.' });
      }
      if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Document content is required.' });
      }

      const cleanFilename = sanitizeFileName(filename.trim());
      const docRef = doc(db, 'documents', cleanFilename);
      
      await setDoc(docRef, {
        filename: cleanFilename,
        content,
        updatedAt: new Date().toISOString()
      });

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
      const { doc, getDoc, setDoc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      const oldFilename = sanitizeFileName(req.params.filename);
      const { content, newFilename } = req.body;
      
      const oldDocRef = doc(db, 'documents', oldFilename);
      const oldDocSnap = await getDoc(oldDocRef);
      
      if (!oldDocSnap.exists()) {
        return res.status(404).json({ success: false, error: \`Document '\${oldFilename}' does not exist.\` });
      }
      if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Content must be provided.' });
      }

      let finalFilename = oldFilename;
      if (newFilename && typeof newFilename === 'string' && newFilename.trim()) {
        const cleanNew = sanitizeFileName(newFilename.trim());
        if (cleanNew !== oldFilename) {
          await deleteDoc(oldDocRef);
          finalFilename = cleanNew;
        }
      }

      const newDocRef = doc(db, 'documents', finalFilename);
      await setDoc(newDocRef, {
        filename: finalFilename,
        content,
        updatedAt: new Date().toISOString()
      });

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
      const { doc, getDoc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      const filename = sanitizeFileName(req.params.filename);
      const docRef = doc(db, 'documents', filename);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return res.status(404).json({ success: false, error: \`Document '\${filename}' not found.\` });
      }
      
      await deleteDoc(docRef);

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
  });

  // 6. Admin: Force Reindex
  app.post('/api/admin/reindex', requireAdmin, async (req, res) => {
    try {
      const result = await ragIndexer.reindexAll();
      res.json({
        success: true,
        message: 'Knowledge base re-indexed successfully.',
        result,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Get Indexed Documents and Knowledge Base Info (Student/Demo Auth)
  app.get('/api/documents', requireAuth, async (req, res) => {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      const officialDocs = [];
      const docsSnapshot = await getDocs(collection(db, 'documents'));
      
      docsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.filename && data.content) {
          const title = data.filename.replace(/\\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase();
          officialDocs.push({
            name: data.filename,
            title,
            sizeBytes: Buffer.byteLength(data.content, 'utf8'),
            summary: data.content.slice(0, 180) + '...',
          });
        }
      });

      let experiencesCount = 0;
      let experiencesList = [];
      const experiencesFile = path.join(process.cwd(), 'data', 'experiences', 'student_experiences.json');
      if (fs.existsSync(experiencesFile)) {
        const raw = fs.readFileSync(experiencesFile, 'utf-8');
        experiencesList = JSON.parse(raw);
        experiencesCount = experiencesList.length;
      }

      res.json({
        success: true,
        knowledgeBaseCount: officialDocs.length,
        officialDocs,
        experiencesCount,
        experiences: experiencesList,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Admin: List all registered students
  app.get('/api/admin/students', requireAdmin, async (req, res) => {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      const usersSnap = await getDocs(collection(db, 'users'));
      const studentsList = [];
      
      usersSnap.forEach(d => {
        const u = d.data();
        if (u.role === 'student') {
          studentsList.push({
            userId: d.id,
            name: u.name,
            email: u.email,
            createdAt: u.createdAt,
            verified: u.verified !== false,
            ipAddress: u.ipAddress || 'unknown',
            userAgent: u.userAgent || 'unknown',
            lastActive: u.lastActive || u.createdAt || new Date().toISOString(),
            questionsCount: u.questionsCount || 0,
          });
        }
      });
      
      studentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        success: true,
        students: studentsList,
      });
    } catch (err) {
      console.error('[API /api/admin/students] Error fetching students:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Delete student
  app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      await deleteDoc(doc(db, 'users', req.params.id));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Change student password
  app.put('/api/admin/students/:id/password', requireAdmin, async (req, res) => {
    try {
      const { hashPassword } = await import('./server/auth.js');
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      }
      
      await updateDoc(doc(db, 'users', req.params.id), {
        passwordHash: hashPassword(newPassword)
      });
      
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });`;

const startIndex = code.indexOf('  // 1. Admin: List all source documents');
const endIndex = code.indexOf('  // Reindex Documents');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newApiBlock + '\n\n' + code.substring(endIndex);
  fs.writeFileSync('server.ts', code);
  console.log("Server.ts API rewritten for Firebase");
} else {
  console.log("Could not find start or end index in server.ts");
}
