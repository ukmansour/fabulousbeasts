const fs = require('fs');
if (!fs.existsSync('dist')) fs.mkdirSync('dist');
['firebase.json', 'CNAME'].forEach(f => { if(fs.existsSync(f)) fs.copyFileSync(f, 'dist/' + f); });
fs.readdirSync('.').forEach(f => {
    if (f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css')) fs.copyFileSync(f, 'dist/' + f);
});
if (fs.existsSync('characters')) fs.cpSync('characters', 'dist/characters', { recursive: true });
console.log('Build complete');
