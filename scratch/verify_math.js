const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:9002/login');
    
    console.log('Logging in...');
    await page.fill('input[type="email"]', 'alain.bertrand.mu@gmail.com');
    await page.fill('input[type="password"]', 'Ab@280765');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    console.log('Login successful.');
    
    console.log('Navigating to new quotation...');
    await page.goto('http://localhost:9002/quotations/new');
    
    // Select first client
    await page.waitForSelector('button[role="combobox"]');
    await page.click('button[role="combobox"]');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Select first product
    await page.click('button[role="combobox"]:nth-of-type(2)');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Set quantity and price
    await page.fill('input[placeholder="1"]', '2');
    await page.fill('input[placeholder="0.00"]', '500');
    
    // Set discount
    await page.fill('input[name="discount"], input[placeholder="0.00"]:last-of-type', '100');
    
    console.log('Verifying math...');
    await page.waitForTimeout(1000); // Wait for recalculation
    
    const content = await page.textContent('body');
    const hasCorrectTotal = content.includes('1,035.00');
    console.log('Form reflects 1,035.00:', hasCorrectTotal);
    
    if (!hasCorrectTotal) {
      console.log('Content dump for debugging:', content.substring(content.indexOf('Subtotal'), content.indexOf('Notes')));
    }
    
    console.log('Saving...');
    await page.click('button:has-text("Save Quotation")');
    
    await page.waitForURL('**/quotations/Q-*');
    const url = page.url();
    const id = url.split('/').pop();
    console.log('Quotation saved with ID:', id);
    
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:9002/dashboard');
    
    await page.waitForSelector(`tr:has-text("${id}")`);
    const dashboardAmount = await page.textContent(`tr:has-text("${id}") td:nth-child(4)`);
    console.log('Dashboard shows for ID ' + id + ':', dashboardAmount);
    
    if (dashboardAmount.includes('1,035.00')) {
      console.log('SUCCESS: Math is consistent across Form and Dashboard.');
    } else {
      console.log('FAILURE: Dashboard shows ' + dashboardAmount + ' instead of 1,035.00');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'scratch/error.png' });
  } finally {
    await browser.close();
  }
})();
