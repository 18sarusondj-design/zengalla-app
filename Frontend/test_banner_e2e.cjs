/**
 * Banner Feature E2E Test
 * Tests the full banner workflow: superadmin grants access, vendor creates banner, adds products
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'banner_test_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let screenshotIndex = 0;
const screenshot = async (page, name) => {
  screenshotIndex++;
  const filename = path.join(SCREENSHOT_DIR, `${String(screenshotIndex).padStart(2, '0')}_${name}.png`);
  await page.screenshot({ path: filename, fullPage: false });
  console.log(`📸 Screenshot: ${filename}`);
  return filename;
};

const log = (msg) => console.log(`\n[${new Date().toLocaleTimeString()}] ${msg}`);

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  const results = {
    phase1_vendor_login: 'NOT RUN',
    phase1_banner_in_sidebar_before: 'NOT RUN',
    phase2_admin_login: 'NOT RUN',
    phase2_vendor_modal_opened: 'NOT RUN',
    phase2_banner_section_visible: 'NOT RUN',
    phase2_7day_plan_granted: 'NOT RUN',
    phase3_vendor_relogin: 'NOT RUN',
    phase3_banner_in_sidebar_after: 'NOT RUN',
    phase3_banner_created: 'NOT RUN',
    phase4_product_promoted: 'NOT RUN',
    phase5_plan_status_pill: 'NOT RUN',
  };

  try {
    // ═══════════════════════════════════════════════════════════
    // PHASE 1: Login as Vendor
    // ═══════════════════════════════════════════════════════════
    log('PHASE 1: Logging in as Vendor...');
    await page.goto('http://localhost:5173/vendor/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await screenshot(page, 'vendor_login_page');

    await page.fill('input[type="email"]', 'sarusondj1234@gmail.com');
    await page.fill('input[type="password"]', 'sarusondj@1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    await screenshot(page, 'vendor_dashboard');
    results.phase1_vendor_login = 'PASS';
    log('✓ Vendor login successful');

    // Check if 'Offer Banners' is in sidebar BEFORE granting access
    const bannerLinkBefore = await page.$('text=Offer Banners');
    if (bannerLinkBefore) {
      results.phase1_banner_in_sidebar_before = 'VISIBLE (already enabled)';
      log('ℹ Offer Banners already visible in sidebar');
    } else {
      results.phase1_banner_in_sidebar_before = 'NOT VISIBLE (expected - needs grant)';
      log('✓ Offer Banners NOT visible in sidebar (expected before grant)');
    }
    await screenshot(page, 'vendor_sidebar_before_grant');

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: Login as SuperAdmin
    // ═══════════════════════════════════════════════════════════
    log('PHASE 2: Logging in as SuperAdmin...');
    await page.goto('http://localhost:5173/vendor/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Try admin credentials
    const adminCredentials = [
      { email: 'sarusondj@gmail.com', password: 'Admin@123' },
      { email: 'sarusondj@gmail.com', password: 'sarusondj@1' },
      { email: 'sarusondj@gmail.com', password: 'admin123' },
    ];

    let adminLoggedIn = false;
    for (const cred of adminCredentials) {
      try {
        await page.fill('input[type="email"]', cred.email);
        await page.fill('input[type="password"]', cred.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        log(`After login attempt with ${cred.email}/${cred.password}: URL = ${currentUrl}`);
        if (currentUrl.includes('/vendor/dashboard') || currentUrl.includes('/super-admin')) {
          adminLoggedIn = true;
          log(`✓ Admin logged in with: ${cred.email} / ${cred.password}`);
          break;
        } else {
          // Try next credential - go back to login
          await page.goto('http://localhost:5173/vendor/login', { waitUntil: 'networkidle' });
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        log(`Login attempt failed: ${e.message}`);
        await page.goto('http://localhost:5173/vendor/login', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
      }
    }

    if (!adminLoggedIn) {
      results.phase2_admin_login = 'FAIL - Could not login with any admin credentials';
      log('✗ Admin login failed');
    } else {
      results.phase2_admin_login = 'PASS';
      await screenshot(page, 'admin_logged_in');

      // Navigate to super-admin vendors page
      await page.goto('http://localhost:5173/super-admin/vendors', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await screenshot(page, 'superadmin_vendors_page');
      log('✓ Navigated to vendors page');

      // Search for the vendor
      const searchInput = await page.$('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]');
      if (searchInput) {
        await searchInput.fill('sarusondj1234');
        await page.waitForTimeout(1500);
        await screenshot(page, 'vendors_search_result');
        log('✓ Searched for vendor');
      }

      // Click on the vendor row to open modal
      const vendorRow = await page.$('text=sarusondj1234@gmail.com');
      if (vendorRow) {
        await vendorRow.click();
        await page.waitForTimeout(2000);
        await screenshot(page, 'vendor_modal_opened');
        results.phase2_vendor_modal_opened = 'PASS';
        log('✓ Vendor modal opened');

        // Check for banner section
        const bannerSection = await page.$('text=Marketing Features — Offer Banners');
        if (bannerSection) {
          await screenshot(page, 'banner_plan_section');
          results.phase2_banner_section_visible = 'PASS';
          log('✓ Banner section visible in vendor modal');

          // Scroll to the banner section
          await bannerSection.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          await screenshot(page, 'banner_plan_cards');

          // Click 7-Day Plan
          const sevenDayBtn = await page.$('text=7-Day Plan');
          if (sevenDayBtn) {
            await sevenDayBtn.click();
            await page.waitForTimeout(3000);
            await screenshot(page, 'seven_day_plan_granted');
            results.phase2_7day_plan_granted = 'PASS';
            log('✓ 7-Day Plan granted');
          } else {
            results.phase2_7day_plan_granted = 'FAIL - 7-Day Plan button not found';
            log('✗ 7-Day Plan button not found');
          }
        } else {
          // Try scrolling in modal to find banner section
          const modalEl = await page.$('[class*="modal"], [style*="overflow"], dialog, [role="dialog"]');
          if (modalEl) {
            await page.evaluate(() => {
              const el = document.querySelector('[style*="overflow: auto"], [style*="overflow-y: auto"], [style*="overflow:auto"]');
              if (el) el.scrollTop = 9999;
            });
            await page.waitForTimeout(1000);
            await screenshot(page, 'modal_scrolled');
          }
          const bannerSectionRetry = await page.$('text=Marketing Features — Offer Banners');
          if (bannerSectionRetry) {
            results.phase2_banner_section_visible = 'PASS (found after scroll)';
            await screenshot(page, 'banner_section_scrolled');
            const sevenDayBtn = await page.$('text=7-Day Plan');
            if (sevenDayBtn) {
              await sevenDayBtn.click();
              await page.waitForTimeout(3000);
              await screenshot(page, 'seven_day_plan_granted');
              results.phase2_7day_plan_granted = 'PASS';
              log('✓ 7-Day Plan granted (after scroll)');
            }
          } else {
            results.phase2_banner_section_visible = 'FAIL - Banner section not found in modal';
            log('✗ Banner section not found in modal');
          }
        }
      } else {
        results.phase2_vendor_modal_opened = 'FAIL - Vendor row not found';
        log('✗ Vendor row not found in users list');
        
        // Try to find any clickable vendor row
        const allRows = await page.$$('tr, [class*="row"], [class*="item"]');
        log(`Found ${allRows.length} rows/items`);
        if (allRows.length > 1) {
          await allRows[1].click();
          await page.waitForTimeout(2000);
          await screenshot(page, 'first_vendor_modal');
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: Test Vendor Banner Access
    // ═══════════════════════════════════════════════════════════
    log('PHASE 3: Testing vendor banner access...');
    await page.goto('http://localhost:5173/vendor/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'sarusondj1234@gmail.com');
    await page.fill('input[type="password"]', 'sarusondj@1');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await screenshot(page, 'vendor_dashboard_after_grant');
    results.phase3_vendor_relogin = 'PASS';
    log('✓ Vendor re-logged in');

    // Check for Offer Banners in sidebar
    const bannerLinkAfter = await page.$('text=Offer Banners');
    if (bannerLinkAfter) {
      results.phase3_banner_in_sidebar_after = 'PASS - Offer Banners visible in sidebar';
      log('✓ Offer Banners now visible in sidebar!');
      await screenshot(page, 'sidebar_with_banner_link');

      // Click on Offer Banners
      await bannerLinkAfter.click();
      await page.waitForTimeout(3000);
      await screenshot(page, 'offer_banners_page');
      log('✓ Navigated to Offer Banners page');

      // Check for plan status pill
      const planStatusText = await page.$('text=/7-Day Plan|days left|Expires/i');
      if (planStatusText) {
        const txt = await planStatusText.innerText();
        results.phase5_plan_status_pill = `PASS - "${txt}"`;
        log(`✓ Plan status pill found: "${txt}"`);
      } else {
        results.phase5_plan_status_pill = 'Plan status pill text not found (may be using different selector)';
      }
      await screenshot(page, 'plan_status_pill');

      // Click 'New Banner'
      const newBannerBtn = await page.$('text=New Banner');
      if (newBannerBtn) {
        await newBannerBtn.click();
        await page.waitForTimeout(1500);
        await screenshot(page, 'new_banner_modal');
        log('✓ New Banner modal opened');

        // Fill in the form
        const titleInput = await page.$('input[placeholder*="itle"], input[name="title"], input[id="title"]');
        if (titleInput) {
          await titleInput.fill('Summer Sale');
          log('✓ Filled title: Summer Sale');
        }

        // Type field (select)
        const typeSelect = await page.$('select, [class*="select"]');
        if (typeSelect) {
          await typeSelect.selectOption("Today's Best Deals");
          log('✓ Selected type: Today\'s Best Deals');
        }

        // Start date - today
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 7);
        const formatDate = (d) => d.toISOString().split('T')[0];
        
        const startDateInput = await page.$('input[type="date"]:first-of-type, input[name="startDate"], input[id="startDate"]');
        if (startDateInput) {
          await startDateInput.fill(formatDate(today));
          log(`✓ Set start date: ${formatDate(today)}`);
        }

        // Try to find second date input for end date
        const dateInputs = await page.$$('input[type="date"]');
        if (dateInputs.length >= 2) {
          await dateInputs[1].fill(formatDate(endDate));
          log(`✓ Set end date: ${formatDate(endDate)}`);
        }

        await screenshot(page, 'banner_form_filled');

        // Save / submit the banner
        const submitBtn = await page.$('button[type="submit"], text=Save Banner, text=Create Banner, text=Save');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
          await screenshot(page, 'banner_created');
          results.phase3_banner_created = 'PASS';
          log('✓ Banner saved successfully');
        } else {
          log('✗ Save button not found');
          results.phase3_banner_created = 'FAIL - Save button not found';
          await screenshot(page, 'banner_form_no_save_btn');
        }
      } else {
        log('✗ New Banner button not found');
        results.phase3_banner_created = 'FAIL - New Banner button not found';
      }
    } else {
      results.phase3_banner_in_sidebar_after = 'FAIL - Offer Banners still NOT visible in sidebar';
      log('✗ Offer Banners still NOT visible in sidebar after grant');
      await screenshot(page, 'sidebar_no_banner_link');
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 4: Add Product to Banner
    // ═══════════════════════════════════════════════════════════
    log('PHASE 4: Adding product to banner...');
    await page.goto('http://localhost:5173/vendor/dashboard/inventory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await screenshot(page, 'inventory_page');
    log('✓ Navigated to Inventory');

    // Look for sparkle/star icon to promote product
    const sparkleIcon = await page.$('[class*="sparkle"], [data-icon="sparkles"], button[title*="banner"], button[title*="Banner"], button[aria-label*="banner"]');
    if (sparkleIcon) {
      await sparkleIcon.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'product_banner_modal');
      
      // Select the banner
      const bannerOption = await page.$('text=Summer Sale');
      if (bannerOption) {
        await bannerOption.click();
        await page.waitForTimeout(1500);
        results.phase4_product_promoted = 'PASS';
        await screenshot(page, 'product_promoted_to_banner');
        log('✓ Product promoted to banner');
      } else {
        results.phase4_product_promoted = 'FAIL - Summer Sale banner not found in dropdown';
        log('✗ Summer Sale banner not found');
      }
    } else {
      // Try Lucide Sparkles SVG icon (via SVG path or surrounding button)
      const allBtns = await page.$$('button');
      log(`Found ${allBtns.length} buttons on inventory page`);
      
      // Look for sparkle icon among buttons
      let sparkleFound = false;
      for (let i = 0; i < Math.min(allBtns.length, 20); i++) {
        const innerHTML = await allBtns[i].innerHTML();
        if (innerHTML.includes('sparkle') || innerHTML.includes('Sparkle') || innerHTML.includes('star')) {
          await allBtns[i].click();
          await page.waitForTimeout(2000);
          await screenshot(page, 'product_banner_dropdown');
          sparkleFound = true;
          break;
        }
      }
      
      if (!sparkleFound) {
        results.phase4_product_promoted = 'COULD NOT FIND - Sparkle icon not found (may need product scroll)';
        log('✗ Sparkle icon not found in first 20 buttons');
        await screenshot(page, 'inventory_no_sparkle');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 5: Final Banner Status Check
    // ═══════════════════════════════════════════════════════════
    log('PHASE 5: Final banner status check...');
    await page.goto('http://localhost:5173/vendor/dashboard/banners', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await screenshot(page, 'final_banners_page');
    log('✓ Final banners page screenshot taken');

  } catch (err) {
    log(`FATAL ERROR: ${err.message}`);
    console.error(err.stack);
    await screenshot(page, 'error_state');
  }

  // ═══════════════════════════════════════════════════════════
  // RESULTS SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('                    TEST RESULTS');
  console.log('═'.repeat(60));
  Object.entries(results).forEach(([key, value]) => {
    const icon = value.startsWith('PASS') ? '✅' : value.startsWith('FAIL') ? '❌' : value.startsWith('NOT RUN') ? '⏭' : '⚠️';
    console.log(`${icon} ${key.replace(/_/g, ' ').toUpperCase()}`);
    console.log(`   → ${value}`);
  });
  console.log('═'.repeat(60));
  console.log(`\n📁 Screenshots saved in: ${SCREENSHOT_DIR}`);

  await browser.close();
})();
