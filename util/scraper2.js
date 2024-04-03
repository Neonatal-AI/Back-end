const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set request interception to modify request headers
  await page.setRequestInterception(true);

  page.on('request', (interceptedRequest) => {
    // Modify request headers to match the captured request
    interceptedRequest.continue({
      method: 'POST',
      headers: {
        'Host': 'analytics.google.com',
        'Sec-Ch-Ua': '"Not(A:Brand";v="24", "Chromium";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36',
        'Sec-Ch-Ua-Platform': '"Linux"',
        'Accept': '*/*',
        'Origin': 'https://www.nichd.nih.gov',
        'X-Client-Data': 'CMTtygE=',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Dest': 'empty',
        'Referer': 'https://www.nichd.nih.gov/',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Priority': 'u=4, i',
        'Content-Length': '0', // Make sure to adjust content-length if you have data
      },
    });
  });

  // Navigate to the URL where the request should be sent
  await page.goto('');

  await browser.close();
})();
