const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'sarusondj@gmail.com');
    await page.fill('input[type="password"]', 'sarusondj@1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.goto('http://localhost:5173/profile');
    await page.waitForTimeout(5000);
    const content = await page.innerHTML('#root');
    console.log('ROOT CONTENT:', content.substring(0, 500));
  } catch(e) { console.log('Script Error:', e.message); }
  
  await browser.close();
})();
