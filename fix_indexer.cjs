const fs = require('fs');
let code = fs.readFileSync('server/rag/indexer.ts', 'utf8');

// Fix StudentExperience
code = code.replace(
  /content: \`Experience: \\$\\{exp\\.experience\\}\\\\nAdvice: \\$\\{exp\\.advice\\}\\\\nYear: \\$\\{exp\\.year\\}\\\\nProgram: \\$\\{exp\\.program\\}\`,/g,
  "content: `Experience: ${exp.experience}\\nQuestion: ${exp.question}`,"
);

// Fix relevanceScore being injected into DocumentChunk
code = code.replace(/,\n\s*relevanceScore: 0/g, "");

// Add 'type' properly to DocumentChunk creations!
code = code.replace(
  /pageOrSection: 'Student Experience Dataset',/g,
  "pageOrSection: 'Student Experience Dataset',\n            type: 'experience',"
);

code = code.replace(
  /pageOrSection: \`Section \${index \+ 1}\`,/g,
  "pageOrSection: `Section ${index + 1}`,\n        type: 'official',"
);

fs.writeFileSync('server/rag/indexer.ts', code);
console.log('Fixed indexer lint issues.');
