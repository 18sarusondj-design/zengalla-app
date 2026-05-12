const fs = require('fs');
const path = 'c:/GROCERY_SHOP/Frontend/src/features/shop/pages/VendorProfile.jsx';
let content = fs.readFileSync(path, 'utf8');
const searchString = 'You can upgrade or change your plan <b>at any time</b>. Upgrades are processed within 2 hours. If you switch to Basic, your shop will be immediately removed from the public website but remain active for in-store use.';

if (content.includes(searchString)) {
    // Add the button after the paragraph closing tag
    content = content.replace('active for in-store use.\n                           </p>\n                        </div>\n                     </div>', 
                             'active for in-store use.\n                           </p>\n                        </div>\n                     </div>\n                     <SectionSaveButton label="Subscription" />');
    fs.writeFileSync(path, content);
    console.log('SUCCESS');
} else {
    console.log('PATTERN NOT FOUND');
}
