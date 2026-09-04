import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { 
  authenticateUser, 
  destroySession, 
  verifySessionToken, 
  registerUser, 
  verifyUserCode, 
  logUserActivity,
  hashPassword 
} from './server/auth.js';
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from './server/firebase.js';
import { ragIndexer } from './server/rag/indexer.js';
import { ragSearcher } from './server/rag/searcher.js';
import { ragGenerator } from './server/rag/generator.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON middleware
  app.use(express.json());

  // CORS middleware for external browsers & multi-origin previews
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Auth Middleware
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-session-token'] as string);

    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Please log in with your credentials.',
      });
    }

    (req as any).session = session;
    next();
  };

  // Admin Middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-session-token'] as string);

    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Please log in.',
      });
    }

    if (session.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. Administrator privileges required.',
      });
    }

    (req as any).session = session;
    next();
  };

  // =========================================================================
  // API ROUTES
  // =========================================================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Campus AI RAG Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const authResult = await authenticateUser(email, password);
    if (!authResult.success || !authResult.session) {
      if (authResult.error === 'verification_required') {
        return res.status(403).json({ success: false, error: 'verification_required', email });
      }
      return res.status(401).json({ success: false, error: authResult.error || 'Authentication failed.' });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    await logUserActivity(authResult.session.userId, ip, userAgent, false);

    res.json({
      success: true,
      session: {
        token: authResult.session.token,
        email: authResult.session.email,
        name: authResult.session.name,
        role: authResult.session.role,
      }
    });
  
  });

  // Signup
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required.' });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const authResult = await registerUser(email, password, name, ip, userAgent);
    if (!authResult.success) {
      return res.status(400).json({ success: false, error: authResult.error || 'Registration failed.' });
    }

    res.json({
      success: true,
      verificationRequired: true,
      email,
      verificationCode: authResult.verificationCode,
      emailSent: authResult.emailSent,
    });
  });

  // Verify Email Code
  app.post('/api/auth/verify', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    const authResult = await verifyUserCode(email, code);
    if (!authResult.success || !authResult.session) {
      return res.status(400).json({ success: false, error: authResult.error || 'Verification failed.' });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    await logUserActivity(authResult.session.userId, ip, userAgent, false);

    res.json({
      success: true,
      session: {
        token: authResult.session.token,
        email: authResult.session.email,
        name: authResult.session.name,
        role: authResult.session.role,
      }
    });
  });

  // Verify Session / Me
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-session-token'] as string);
    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    }

    res.json({
      success: true,
      user: {
        email: session.email,
        name: session.name,
        role: session.role,
      }
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-session-token'] as string);
    destroySession(token);
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // Chat API (RAG Execution)
  app.post('/api/chat', requireAuth, async (req, res) => {
    try {
      const { question } = req.body;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid question.',
        });
      }

      const cleanQuery = question.trim();

      // Log student activity & increment questions asked
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const session = (req as any).session;
      if (session && session.userId && session.role === 'student') {
        logUserActivity(session.userId, ip, userAgent, true).catch(err => {
          console.error('[API /api/chat] Error updating student activity stats:', err);
        });
      }

      // 1. Vector & Semantic Search
      const retrieval = await ragSearcher.search(cleanQuery);

      // 2. Generate grounded response with separated Official and Student Experience
      const responsePayload = await ragGenerator.generateAnswer(retrieval);

      return res.json(responsePayload);
    } catch (err: any) {
      console.error('[API /api/chat] Error processing question:', err);
      return res.status(500).json({
        success: false,
        error: "Sorry, I couldn't process that question right now.",
        detail: err.message,
      });
    }
  });

  // =========================================================================
  // ADMIN DOCUMENT MANAGEMENT APIS (FIREBASE)
  // =========================================================================

  // Helper to sanitize filenames
  const sanitizeFileName = (name: string): string => {
    let clean = name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    if (!clean.endsWith('.txt') && !clean.endsWith('.md') && !clean.endsWith('.json')) {
      clean += '.txt';
    }
    return clean;
  };

  // 1. Admin: List all source documents
  app.get('/api/admin/documents', requireAdmin, async (req, res) => {
    try {
      const documentList: any[] = [];
      const allChunks = ragIndexer.getChunks();
      
      try {
        const docsSnapshot = await getDocs(collection(db, 'documents'));
        docsSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.filename && data.content) {
            const title = data.filename.replace(/\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase();
            const docChunks = allChunks.filter(c => c.id.startsWith(data.filename.replace(/[^a-zA-Z0-9]/g, '_')));
            
            documentList.push({
              filename: data.filename,
              title,
              sizeBytes: Buffer.byteLength(data.content, 'utf8'),
              linesCount: data.content.split('\n').length,
              modifiedAt: data.updatedAt || new Date().toISOString(),
              chunkCount: docChunks.length > 0 ? docChunks.length : Math.max(1, Math.ceil(data.content.length / 800)),
              preview: data.content.slice(0, 240) + (data.content.length > 240 ? '...' : ''),
            });
          }
        });
      } catch (fsErr) {
        console.warn('[Admin] Firestore getDocs failed, checking local documents:', fsErr);
      }

      // If Firestore had no documents or failed, fall back to local disk
      if (documentList.length === 0) {
        const docsDir = path.join(process.cwd(), 'data', 'documents');
        if (fs.existsSync(docsDir)) {
          const files = fs.readdirSync(docsDir);
          for (const file of files) {
            if (!file.endsWith('.txt') && !file.endsWith('.md') && !file.endsWith('.json')) continue;
            const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
            const title = file.replace(/\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase();
            const docChunks = allChunks.filter(c => c.id.startsWith(file.replace(/[^a-zA-Z0-9]/g, '_')));
            documentList.push({
              filename: file,
              title,
              sizeBytes: Buffer.byteLength(content, 'utf8'),
              linesCount: content.split('\n').length,
              modifiedAt: fs.statSync(path.join(docsDir, file)).mtime.toISOString(),
              chunkCount: docChunks.length > 0 ? docChunks.length : Math.max(1, Math.ceil(content.length / 800)),
              preview: content.slice(0, 240) + (content.length > 240 ? '...' : ''),
            });
          }
        }
      }

      res.json({
        success: true,
        documents: documentList,
        totalDocuments: documentList.length,
        totalChunks: allChunks.length,
      });
    } catch (err: any) {
      console.error('[Admin] Error listing documents:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Admin: Get specific document content
  app.get('/api/admin/documents/:filename', requireAdmin, async (req, res) => {
    try {
      const filename = sanitizeFileName(req.params.filename);
      let content = '';
      let modifiedAt = new Date().toISOString();

      try {
        const docRef = doc(db, 'documents', filename);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          content = data.content || '';
          modifiedAt = data.updatedAt || modifiedAt;
        }
      } catch (fsErr) {
        console.warn('[Admin] Firestore getDoc failed:', fsErr);
      }

      if (!content) {
        const localPath = path.join(process.cwd(), 'data', 'documents', filename);
        if (fs.existsSync(localPath)) {
          content = fs.readFileSync(localPath, 'utf8');
          modifiedAt = fs.statSync(localPath).mtime.toISOString();
        }
      }

      if (!content) {
        return res.status(404).json({ success: false, error: `Document '${filename}' not found.` });
      }

      res.json({
        success: true,
        filename,
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
        modifiedAt,
      });
    } catch (err: any) {
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
      const now = new Date().toISOString();
      
      // 1. Save to Firestore
      try {
        const docRef = doc(db, 'documents', cleanFilename);
        await setDoc(docRef, {
          filename: cleanFilename,
          content,
          updatedAt: now
        });
      } catch (fsErr) {
        console.warn('[Admin] Firestore save failed, saving to local documents:', fsErr);
      }

      // 2. Save to local disk as permanent backup
      const docsDir = path.join(process.cwd(), 'data', 'documents');
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, cleanFilename), content, 'utf8');

      // 3. Auto reindex after adding
      const reindexStats = await ragIndexer.reindexAll();

      res.json({
        success: true,
        message: `Document '${cleanFilename}' saved and indexed successfully.`,
        filename: cleanFilename,
        reindexStats,
      });
    } catch (err: any) {
      console.error('[Admin] Error creating document:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Admin: Update existing document
  app.put('/api/admin/documents/:filename', requireAdmin, async (req, res) => {
    try {
      const oldFilename = sanitizeFileName(req.params.filename);
      const { content, newFilename } = req.body;
      if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Content must be provided.' });
      }

      let finalFilename = oldFilename;
      if (newFilename && typeof newFilename === 'string' && newFilename.trim()) {
        const cleanNew = sanitizeFileName(newFilename.trim());
        if (cleanNew !== oldFilename) {
          try {
            await deleteDoc(doc(db, 'documents', oldFilename));
          } catch (e) {}
          const oldLocal = path.join(process.cwd(), 'data', 'documents', oldFilename);
          if (fs.existsSync(oldLocal)) fs.unlinkSync(oldLocal);
          finalFilename = cleanNew;
        }
      }

      const now = new Date().toISOString();
      // 1. Save to Firestore
      try {
        await setDoc(doc(db, 'documents', finalFilename), {
          filename: finalFilename,
          content,
          updatedAt: now
        });
      } catch (fsErr) {
        console.warn('[Admin] Firestore update failed, updating local file:', fsErr);
      }

      // 2. Update local disk file
      const docsDir = path.join(process.cwd(), 'data', 'documents');
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, finalFilename), content, 'utf8');

      // 3. Auto re-index
      const reindexStats = await ragIndexer.reindexAll();

      res.json({
        success: true,
        message: `Document '${finalFilename}' updated and re-indexed.`,
        filename: finalFilename,
        reindexStats,
      });
    } catch (err: any) {
      console.error('[Admin] Error updating document:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Admin: Delete document
  app.delete('/api/admin/documents/:filename', requireAdmin, async (req, res) => {
    try {
      const filename = sanitizeFileName(req.params.filename);
      try {
        await deleteDoc(doc(db, 'documents', filename));
      } catch (e) {}

      const localPath = path.join(process.cwd(), 'data', 'documents', filename);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }

      // Auto reindex
      const reindexStats = await ragIndexer.reindexAll();

      res.json({
        success: true,
        message: `Document '${filename}' deleted and knowledge base refreshed.`,
        reindexStats,
      });
    } catch (err: any) {
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
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Get Indexed Documents and Knowledge Base Info (Student/Demo Auth)
  app.get('/api/documents', requireAuth, async (req, res) => {
    try {
      const officialDocs: any[] = [];
      try {
        const docsSnapshot = await getDocs(collection(db, 'documents'));
        docsSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.filename && data.content) {
            const title = data.filename.replace(/\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase();
            officialDocs.push({
              name: data.filename,
              title,
              sizeBytes: Buffer.byteLength(data.content, 'utf8'),
              summary: data.content.slice(0, 180) + '...',
            });
          }
        });
      } catch (fsErr) {
        console.warn('[Documents] Firestore getDocs failed, reading local documents:', fsErr);
      }

      if (officialDocs.length === 0) {
        const docsDir = path.join(process.cwd(), 'data', 'documents');
        if (fs.existsSync(docsDir)) {
          const files = fs.readdirSync(docsDir);
          for (const file of files) {
            if (!file.endsWith('.txt') && !file.endsWith('.md') && !file.endsWith('.json')) continue;
            const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
            const title = file.replace(/\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase();
            officialDocs.push({
              name: file,
              title,
              sizeBytes: Buffer.byteLength(content, 'utf8'),
              summary: content.slice(0, 180) + '...',
            });
          }
        }
      }

      let experiencesCount = 0;
      let experiencesList: any[] = [];
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
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Admin: List all registered students
  app.get('/api/admin/students', requireAdmin, async (req, res) => {
    try {
      const studentsList: any[] = [];
      const usersMap: Record<string, any> = {};

      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(d => {
          usersMap[d.id] = { ...d.data(), userId: d.id };
        });
      } catch (fsErr) {
        console.warn('[Admin] Firestore getDocs users failed, reading local users backup:', fsErr);
      }

      // Merge with local users.json if any
      const usersBackupPath = path.join(process.cwd(), 'data', 'users.json');
      if (fs.existsSync(usersBackupPath)) {
        try {
          const localUsers = JSON.parse(fs.readFileSync(usersBackupPath, 'utf8'));
          for (const [id, u] of Object.entries(localUsers as Record<string, any>)) {
            if (!usersMap[id]) {
              usersMap[id] = { ...u, userId: id };
            }
          }
        } catch (e) {}
      }

      for (const u of Object.values(usersMap)) {
        if (u.role === 'student') {
          studentsList.push({
            userId: u.userId || u.id,
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
      }
      
      studentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        success: true,
        students: studentsList,
      });
    } catch (err: any) {
      console.error('[API /api/admin/students] Error fetching students:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Admin: Delete student
  app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (e) {
        console.warn('[Admin] Firestore delete user failed:', e);
      }
      const usersBackupPath = path.join(process.cwd(), 'data', 'users.json');
      if (fs.existsSync(usersBackupPath)) {
        try {
          const localUsers = JSON.parse(fs.readFileSync(usersBackupPath, 'utf8'));
          if (localUsers[id]) {
            delete localUsers[id];
            fs.writeFileSync(usersBackupPath, JSON.stringify(localUsers, null, 2), 'utf8');
          }
        } catch (e) {}
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Admin: Change student password
  app.put('/api/admin/students/:id/password', requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      }
      
      const newHash = hashPassword(newPassword);
      try {
        await updateDoc(doc(db, 'users', id), {
          passwordHash: newHash
        });
      } catch (e) {
        console.warn('[Admin] Firestore password update failed:', e);
      }

      const usersBackupPath = path.join(process.cwd(), 'data', 'users.json');
      if (fs.existsSync(usersBackupPath)) {
        try {
          const localUsers = JSON.parse(fs.readFileSync(usersBackupPath, 'utf8'));
          if (localUsers[id]) {
            localUsers[id].passwordHash = newHash;
            fs.writeFileSync(usersBackupPath, JSON.stringify(localUsers, null, 2), 'utf8');
          }
        } catch (e) {}
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reindex Documents
  app.post('/api/reindex', requireAuth, async (req, res) => {
    try {
      const result = await ragIndexer.reindexAll();
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve full PHP project code for download or inspection
  app.get('/api/php-project', (req, res) => {
    res.json({
      success: true,
      message: "PHP standalone project files available in /campus-ai directory.",
    });
  });

  // =========================================================================
  // VITE / STATIC SERVING
  // =========================================================================
  const isProduction = process.env.NODE_ENV === 'production' || 
                       (typeof __dirname !== 'undefined' && __dirname.endsWith('dist')) || 
                       !fs.existsSync(path.join(process.cwd(), 'src', 'main.tsx'));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Campus AI Server] Running on http://localhost:${PORT}`);
    // Initialize RAG indexing in the background so it never blocks container startup or health checks
    ragIndexer.initialize().catch(err => {
      console.error('[Campus AI Server] Background RAG initialization error:', err);
    });
  });
}

startServer().catch(err => {
  console.error('[Campus AI Server] Startup error:', err);
});
