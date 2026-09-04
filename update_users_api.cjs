const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const newUsersApi = `  // 8. Admin: List all registered students (with analytics, timing, ip, user-agent)
  app.get('/api/admin/students', requireAdmin, async (req, res) => {
    try {
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      if (!fs.existsSync(usersPath)) {
        return res.json({ success: true, students: [] });
      }
      
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const studentsList = Object.values(users)
        .filter((u: any) => u.role === 'student')
        .map((u: any) => ({
          userId: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          verified: u.verified !== false,
          ipAddress: u.ipAddress || 'unknown',
          userAgent: u.userAgent || 'unknown',
          lastActive: u.lastActive || u.createdAt || new Date().toISOString(),
          questionsCount: u.questionsCount || 0,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        success: true,
        students: studentsList,
      });
    } catch (err: any) {
      console.error('[API /api/admin/students] Error fetching students:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Delete student
  app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
    try {
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      if (fs.existsSync(usersPath)) {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        if (users[req.params.id]) {
          delete users[req.params.id];
          fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin: Change student password
  app.put('/api/admin/students/:id/password', requireAdmin, async (req, res) => {
    try {
      const { hashPassword } = await import('./server/auth.js');
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      }
      
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      if (fs.existsSync(usersPath)) {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        if (users[req.params.id]) {
          users[req.params.id].passwordHash = hashPassword(newPassword);
          fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });`;

const startIndex = code.indexOf('  // 8. Admin: List all registered students');
const endIndex = code.indexOf('  // Reindex Documents');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newUsersApi + '\n\n' + code.substring(endIndex);
  fs.writeFileSync('server.ts', code);
  console.log("Users API replaced");
} else {
  console.log("Could not find start or end index");
}
