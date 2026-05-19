const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('console', msg => console.log('CONSOLE:', msg.text()));

  try {
    // Go to root to initialize local storage
    await page.goto('http://localhost:5173/');
    
    // Inject fake user data into localStorage
    const fakeUser = {
      _id: '6a075b6b7cdd22649c86b216',
      name: 'Sarvesh H',
      email: 'sarusondj@gmail.com',
      role: 'customer',
      status: 'active',
      walletBalance: 0,
      shopBalances: [],
      location: { type: 'Point', coordinates: [73.8567, 18.5204] },
      address: '',
      pincode: '580031'
    };
    
    await page.evaluate((user) => {
      localStorage.setItem('token', 'fake-token-123');
      localStorage.setItem('cached_user', JSON.stringify(user));
    }, fakeUser);
    
    // Now navigate to profile
    console.log('Navigating to profile...');
    await page.goto('http://localhost:5173/profile');
    await page.waitForTimeout(5000);
    
    const content = await page.innerHTML('#root');
    console.log('ROOT HTML SNIPPET:', content.substring(0, 500));
  } catch(e) { console.log('Script Error:', e.message); }
  
  await browser.close();
})();
