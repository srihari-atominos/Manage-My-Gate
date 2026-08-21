const puppeteer = require('../../frontend/node_modules/puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 400, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to http://127.0.0.1:8085');
    await page.goto('http://127.0.0.1:8085', { timeout: 0 });
    
    console.log('Waiting 10 seconds for Expo to render...');
    await new Promise(r => setTimeout(r, 10000));
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'admin_controls_evidence.png' });
    console.log('Screenshot saved to admin_controls_evidence.png');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
