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
    
    console.log('Waiting 8 seconds for Expo to render...');
    await new Promise(r => setTimeout(r, 8000));
    
    // Fill in Visitor Name
    console.log('Typing name...');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Test Visitor');
    
    await new Promise(r => setTimeout(r, 1000));

    // Function to click an element by exact text
    const clickText = async (text) => {
      await page.evaluate((text) => {
        const elements = [...document.querySelectorAll('div')];
        const el = elements.find(e => e.innerText === text);
        if (el) el.click();
      }, text);
      await new Promise(r => setTimeout(r, 1000));
    };

    console.log('Clicking Next...');
    await clickText('Next'); // To Schedule
    console.log('Clicking Next...');
    await clickText('Next'); // To Options
    console.log('Clicking Next...');
    await clickText('Next'); // To Review
    console.log('Clicking Generate Pass...');
    await clickText('Generate Pass'); // Submit
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'test_screenshots/wizard_final.png' });
    console.log('Screenshot saved to test_screenshots/wizard_final.png');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();

