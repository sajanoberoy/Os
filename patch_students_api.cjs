const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const newUsersApi = `  app.get('/api/admin/students', requireAdmin, async (req, res) => {
    try {
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      if (!fs.existsSync(usersPath)) {
        return res.json({ success: true, students: [] });
      }
      
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const studentsList = Object.entries(users)
        .filter(([id, u]: [string, any]) => u.role === 'student')
        .map(([id, u]: [string, any]) => ({
          userId: id,
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
  });`;

const startIndex = code.indexOf("  app.get('/api/admin/students', requireAdmin, async (req, res) => {");
const endIndex = code.indexOf("  // Admin: Delete student");

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newUsersApi + '\n\n' + code.substring(endIndex);
  fs.writeFileSync('server.ts', code);
  console.log("Students GET API patched");
} else {
  console.log("Could not find start or end index");
}
