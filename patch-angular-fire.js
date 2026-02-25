const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('!!module.hot')) {
        content = content.replace(/!!module\.hot/g, 'false');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Patched', filePath);
    }
}

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs')) {
            replaceInFile(fullPath);
        }
    }
}

const targetDir = path.join(__dirname, 'node_modules', '@angular', 'fire');
processDirectory(targetDir);
console.log('Angular Fire patch complete.');
