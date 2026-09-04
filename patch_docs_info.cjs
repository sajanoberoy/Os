const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const newInfoApi = `  // 7. Get Indexed Documents and Knowledge Base Info (Student/Demo Auth)
  app.get('/api/documents', requireAuth, async (req, res) => {
    try {
      const experiencesFile = path.join(process.cwd(), 'data', 'experiences', 'student_experiences.json');
      const dirPath = path.join(process.cwd(), 'data', 'documents');

      const officialDocs: Array<{ name: string; title: string; sizeBytes: number; summary: string }> = [];
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (!file.endsWith('.txt') && !file.endsWith('.md') && !file.endsWith('.json')) continue;
          const filePath = path.join(dirPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const title = file.replace(/\\.(txt|md|json)$/, '').replace(/_/g, ' ').toUpperCase();
          officialDocs.push({
            name: file,
            title,
            sizeBytes: Buffer.byteLength(content, 'utf8'),
            summary: content.slice(0, 180) + '...',
          });
        }
      }

      let experiencesCount = 0;
      let experiencesList: any[] = [];
      if (fs.existsSync(experiencesFile)) {
        const raw = fs.readFileSync(experiencesFile, 'utf-8');
        experiencesList = JSON.parse(raw);
        experiencesCount = experiencesList.length;
      }`;

const startIndex = code.indexOf('  // 7. Get Indexed Documents and Knowledge Base Info (Student/Demo Auth)');
const endIndex = code.indexOf('      let experiencesCount = 0;');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newInfoApi + code.substring(endIndex + '      let experiencesCount = 0;\n      let experiencesList: any[] = [];\n      if (fs.existsSync(experiencesFile)) {\n        const raw = fs.readFileSync(experiencesFile, \'utf-8\');\n        experiencesList = JSON.parse(raw);\n        experiencesCount = experiencesList.length;\n      }'.length);
  fs.writeFileSync('server.ts', code);
  console.log("Documents Info API replaced");
} else {
  console.log("Could not find start or end index");
}
