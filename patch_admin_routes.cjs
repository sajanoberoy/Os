const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
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
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./server/firebase.js');
      const { hashPassword } = await import('./server/auth.js');
      
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
  });

  // Reindex Documents`;

code = code.replace('  // Reindex Documents', replacement);
fs.writeFileSync('server.ts', code);
