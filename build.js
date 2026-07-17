const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        const stat = fs.lstatSync(fromPath);
        if (stat.isFile()) {
            fs.copyFileSync(fromPath, toPath);
        } else if (stat.isDirectory()) {
            copyFolderSync(fromPath, toPath);
        }
    });
}

if (!fs.existsSync('dist')) fs.mkdirSync('dist');
['firebase.json', 'CNAME'].forEach(f => { if(fs.existsSync(f)) fs.copyFileSync(f, 'dist/' + f); });
fs.readdirSync('.').forEach(f => {
    if (f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css')) fs.copyFileSync(f, 'dist/' + f);
});
if (fs.existsSync('characters')) {
    copyFolderSync('characters', 'dist/characters');
}
console.log('Build complete');

