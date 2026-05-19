const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  try {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'sarusondj@gmail.com');
    await page.fill('input[type="password"]', 'sarusondj@1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.goto('http://localhost:5173/profile');
    await page.waitForTimeout(3000);
  } catch(e) { console.log('Script Error:', e.message); }
  
  console.log('Done');
  await browser.close();
})();
