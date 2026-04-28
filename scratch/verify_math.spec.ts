import { test, expect } from '@playwright/test';

test('verify quotation math and dashboard sync', async ({ page }) => {
  // 1. Login
  await page.goto('http://localhost:9002/login');
  await page.fill('input[type="email"]', 'alain.bertrand.mu@gmail.com');
  await page.fill('input[type="password"]', 'Ab@280765');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForURL('**/dashboard');
  
  // 2. Go to Quotations
  await page.goto('http://localhost:9002/quotations/new');
  
  // 3. Fill the form
  // Wait for clients to load
  await page.waitForSelector('button[role="combobox"]');
  await page.click('button[role="combobox"]');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  // Fill item (first item is already there by default)
  await page.click('button[role="combobox"]:nth-of-type(2)');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  await page.fill('input[name="items.0.quantity"]', '2');
  await page.fill('input[name="items.0.unitPrice"]', '500');
  await page.fill('input[name="discount"]', '100');
  
  // Verify totals in form
  // Expect Subtotal: 1000
  // Expect Discount: 100
  // Expect Amount before VAT: 900
  // Expect VAT (15%): 135
  // Expect Grand Total: 1035
  
  const grandTotalText = await page.textContent('div:has-text("Grand Total:") + span, span:has-text("Grand Total") + span');
  console.log('Form Grand Total:', grandTotalText);
  
  // Save
  await page.click('button:has-text("Save Quotation")');
  
  // Wait for redirect to details page
  await page.waitForURL('**/quotations/Q-*');
  const quotationId = page.url().split('/').pop();
  console.log('Created Quotation ID:', quotationId);
  
  // 4. Check Dashboard
  await page.goto('http://localhost:9002/dashboard');
  
  // Find the quotation in the table
  const dashboardAmount = await page.textContent(`tr:has-text("${quotationId}") td:nth-child(4)`);
  console.log('Dashboard Amount:', dashboardAmount);
  
  expect(dashboardAmount).toContain('1,035.00');
});
