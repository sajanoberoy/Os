const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace app.post('/api/auth/verify', async (req, res) => {
code = code.replace(
  "app.post('/api/auth/verify', async (req, res) => {",
  "app.post('/api/auth/verify', async (req, res) => {\n    try {"
);

// End the try catch block
code = code.replace(
  "      }\n    });\n  });\n\n  // Verify Session / Me",
  "      }\n    });\n    } catch (err) {\n      console.error(err);\n      res.status(500).json({ success: false, error: 'Internal server error during verification.' });\n    }\n  });\n\n  // Verify Session / Me"
);

fs.writeFileSync('server.ts', code);
