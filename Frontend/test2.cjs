const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('console', msg => console.log('CONSOLE:', msg.text()));

  try {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'sarusondj@gmail.com');
    await page.fill('input[type="password"]', 'sarusondj@1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.goto('http://localhost:5173/profile');
    await page.waitForTimeout(5000);
    const content = await page.content();
    console.log('HTML SNIPPET:', content.substring(0, 1500));
    if (content.includes('Loading Experience')) console.log('PAGE LOADER IS PRESENT');
  } catch(e) { console.log('Script Error:', e.message); }
  
  await browser.close();
})();
