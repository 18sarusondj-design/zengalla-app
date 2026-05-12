const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src', 'features');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.resolve(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk(baseDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // 1. Feature-specific components
    // If from shop/pages/X -> ../../components/shop/Y, change to ../components/Y
    content = content.replace(/from\s+['"]\.\.\/\.\.\/components\/shop\/([^'"]+)['"]/g, "from '../components/$1'");
    content = content.replace(/from\s+['"]\.\.\/\.\.\/components\/customer\/([^'"]+)['"]/g, "from '../components/$1'");
    content = content.replace(/from\s+['"]\.\.\/\.\.\/components\/auth\/([^'"]+)['"]/g, "from '../components/$1'");
    content = content.replace(/from\s+['"]\.\.\/\.\.\/components\/user\/([^'"]+)['"]/g, "from '../components/$1'"); // user was renamed to customer components

    // 2. Common components
    content = content.replace(/from\s+['"]\.\.\/\.\.\/components\/common\/([^'"]+)['"]/g, "from '../../common/components/$1'");

    // 3. Admin Layout (specific case)
    content = content.replace(/from\s+['"]\.\.\/\.\.\/components\/admin\/AdminLayout['"]/g, "from '../components/AdminLayout'");

    fs.writeFileSync(file, content);
});

console.log('Rollback import fix (v6 - Components) complete.');
