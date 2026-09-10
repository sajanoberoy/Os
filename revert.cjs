const fs = require('fs');

// 1. Delete DarkModeToggle.tsx
if (fs.existsSync('src/components/DarkModeToggle.tsx')) {
    fs.unlinkSync('src/components/DarkModeToggle.tsx');
}

// 2. Clean up .tsx files
const files = [
    'src/App.tsx',
    'src/components/LoginScreen.tsx',
    'src/components/ChatScreen.tsx',
    'src/components/MessageItem.tsx',
    'src/components/AdminPanel.tsx',
    'src/components/SourceModal.tsx'
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove all dark: classes (including pseudo-variants like dark:hover:bg-...)
    content = content.replace(/\s*dark:[a-zA-Z0-9\-\/:]+/g, '');
    
    // Remove prose classes added to markdown-body
    content = content.replace(/\s*prose\s+max-w-none/g, '');
    content = content.replace(/\s*prose\s*/g, '');
    
    // Remove DarkModeToggle imports
    content = content.replace(/import \{\s*DarkModeToggle\s*\} from '\.\/DarkModeToggle';\n?/g, '');
    
    // Remove DarkModeToggle components
    content = content.replace(/<DarkModeToggle \/>\n?\s*/g, '');
    
    // Fix Absolute top-4 right-4 wrapper in LoginScreen
    content = content.replace(/<div className="absolute top-4 right-4"><\/div>\n\s*/g, '');
    
    fs.writeFileSync(file, content);
});

// 3. Clean up index.html
if (fs.existsSync('index.html')) {
    let html = fs.readFileSync('index.html', 'utf8');
    html = html.replace(/<script>if \(localStorage\.getItem\('campus_ai_theme'\).*?<\/script>/s, '');
    fs.writeFileSync('index.html', html);
}

// 4. Clean up src/index.css
if (fs.existsSync('src/index.css')) {
    let css = fs.readFileSync('src/index.css', 'utf8');
    css = css.replace(/@custom-variant dark \(&:where\(\.dark, \.dark \*\)\);\n?/g, '');
    css = css.replace(/@layer components \{[\s\S]*?\}\n/g, '');
    fs.writeFileSync('src/index.css', css);
}

console.log('Revert complete');
