const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'Frontend', 'src');

const componentMap = {
  'AnalyticsComponents': 'components/shop/AnalyticsComponents',
  'BulkImportModal': 'components/shop/BulkImportModal',
  'CustomerWeightModal': 'components/shop/CustomerWeightModal',
  'ProductDetailsModal': 'components/shop/ProductDetailsModal',
  'ReceiptTemplate': 'components/shop/ReceiptTemplate',
  'CustomerLayout': 'components/user/CustomerLayout',
  'CustomerReportModal': 'components/user/CustomerReportModal',
  'DeliveryLocationModal': 'components/user/DeliveryLocationModal',
  'FeaturedCarousel': 'components/user/FeaturedCarousel',
  'FullScreenLoader': 'components/user/FullScreenLoader',
  'ReviewModal': 'components/user/ReviewModal',
  'ShopCard': 'components/user/ShopCard',
  'ShopMapModal': 'components/user/ShopMapModal',
  'AdminLayout': 'components/admin/AdminLayout',
  'Logo': 'components/common/Logo',
  'Pagination': 'components/common/Pagination'
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const relToSrc = path.relative(path.dirname(filePath), srcDir).replace(/\\/g, '/');
  const prefix = relToSrc ? relToSrc + '/' : './';

  // Fix core imports
  const corePatterns = [
    { from: /import\s+.*\s+from\s+['"].*config\/supabaseClient['"]/g, to: `import { supabase } from '${prefix}config/supabaseClient'` },
    { from: /import\s+.*\s+from\s+['"].*hooks\/useQueryParam['"]/g, to: `import { useQueryParam } from '${prefix}hooks/useQueryParam'` },
    { from: /import\s+.*\s+from\s+['"].*context\/StoreContext['"]/g, to: `import { useStore } from '${prefix}context/StoreContext'` },
    { from: /import\s+.*\s+from\s+['"].*context\/AuthContext['"]/g, to: `import { useAuth } from '${prefix}context/AuthContext'` },
    { from: /import\s+.*\s+from\s+['"].*auth\/useAuth['"]/g, to: `import { useAuth } from '${prefix}context/AuthContext'` },
    { from: /import\s+.*\s+from\s+['"].*\/useAuth['"]/g, to: `import { useAuth } from '${prefix}context/AuthContext'` },
    { from: /import\s+.*\s+from\s+['"].*utils\/passwordStrength['"]/g, to: `import { getPasswordStrength } from '${prefix}utils/passwordStrength'` },
    { from: /import\s+.*\s+from\s+['"].*utils\/dateUtils['"]/g, to: `import { formatDate } from '${prefix}utils/dateUtils'` }
  ];

  corePatterns.forEach(p => {
    if (p.from.test(content)) {
      content = content.replace(p.from, p.to);
      changed = true;
    }
  });

  // Fix component imports
  Object.keys(componentMap).forEach(compName => {
    const compPattern = new RegExp(`import\\s+(.*)\\s+from\\s+['"].*${compName}['"]`, 'g');
    if (compPattern.test(content)) {
      content = content.replace(compPattern, (match, p1) => {
        return `import ${p1} from '${prefix}${componentMap[compName]}'`;
      });
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDir(filePath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      fixFile(filePath);
    }
  });
}

processDir(srcDir);
console.log('Giga import fix complete!');
