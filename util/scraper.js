const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const puppeteer = require('puppeteer');
async function getEpboResults(gestationalAge, birthWeight, sex, singleton, steroid) {
  const formUrl = 'https://www.nichd.nih.gov/research/supported/EPBO/use';
  const formData = {
    birth_weight: birthWeight.toString(),
    sex: sex.toString(),
    singleton: singleton.toString(),
    steroid: steroid.toString(),
  };

  // Launch Puppeteer (with or without headless mode)
  //const browser = await puppeteer.launch({ headless: true });
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
  const page = await browser.newPage();


  try {
    // Navigate to the form URL
    await page.goto(formUrl);

    // Wait for the form element to load
    await page.waitForSelector('#AppCalc');

    // Select gestational age
    const gestationalAgeDropdown = await page.$('select[name="gestational_age"]');
    await gestationalAgeDropdown.select(gestationalAge.toString());

    // Fill other form fields
    for (const [fieldName, fieldValue] of Object.entries(formData)) {
      const fieldElement = await page.waitForSelector(`[name="${fieldName}"]`);

      if (fieldName !== "birth_weight") {
        const currentValue = await fieldElement.evaluate(el => el.checked ? el.value : '');
        if (currentValue !== fieldValue) {
          await fieldElement.click();
        }
      } else {
        await fieldElement.type(fieldValue);
      }
    }

    // Submit the form
    await page.click('button.btn-primary.epbo-calculator[type="submit"]');

    // Wait for a specific element to appear after the click
    await page.waitForSelector('div#AppCalc span', { timeout: 30000 });

    // Get the updated page content
    const pageContent = await page.content();

    // Parse the response HTML using Cheerio
    const cheerio = require('cheerio');
    const $ = cheerio.load(pageContent);

    // Extract the data point
    let average_survival_active_treatment;

    const gridResults = $('#AppCalc');
    if (gridResults.length > 0) {
      const outcomesDiv = gridResults.find('div.outcomes');
      if (outcomesDiv.length > 0) {
        const rateWrapDiv = outcomesDiv.find('div.rate-wrap');
        if (rateWrapDiv.length > 0) {
          const spanElements = rateWrapDiv.find('span');
          if (spanElements.length > 1) {
            average_survival_active_treatment = spanElements.eq(1).text();
          } else {
            console.error("Error: Second span element not found");
          }
        } else {
          console.error("Error: rate-wrap div not found");
        }
      } else {
        console.error("Error: outcomes div not found");
      }
    } else {
      console.error("Error: grid-results div not found");
    }

    // Log the extracted information
    // console.log('Extracted Information:', average_survival_active_treatment);
    return average_survival_active_treatment;
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

(async () => {
  const gestationalAge = 22;
  const birthWeight = 401;

  //0 or 1 for buttons as they appear on page (0 is male, yes, yes)
  const sex = 0;
  const singleton = 0;
  const steroid = 0;
  let time1 = new Date().getTime();
  const survival = await getEpboResults(gestationalAge, birthWeight, sex, singleton, steroid);
  let time2 = new Date().getTime();
  console.log(survival);
  console.log(time2 - time1, "ms");
})();


module.exports = {getEpboResults};