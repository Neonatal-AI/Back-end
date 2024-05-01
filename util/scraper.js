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

  // Launch Puppeteer (with or without headless mode) <--- Use headless mode unless testing/debugging.]
  // Also necessary to run 'no-sandbox' and 'disable-dev-shm-usage' to optimize speed and allow usage in a heroku dyno
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

    const birthElement = await page.waitForSelector(`[name="birth_weight"]`)
    await birthElement.type(formData.birth_weight);

    try {
      if (formData.sex == "Male") {
        sexElement = await page.waitForSelector('[title="male"]');
        await sexElement.click();
      }
      else if (formData.sex == "Female") {
        sexElement = await page.waitForSelector('[title="female"]');
        await sexElement.click();
      }

      if (formData.singleton == "True") {
        singletonElement = await page.waitForSelector('input[title="yes"][name="singleton"]');
        await singletonElement.click();
      }
      else if (formData.singleton == "False") {
        singletonElement = await page.waitForSelector('input[title="no"][name="singleton"]');
        await singletonElement.click();
      }

      if (formData.steroid == "True") {
        steroidElement = await page.waitForSelector('input[title="yes"][name="steroid"]');
        await steroidElement.click();
      }
      else if (formData.steroid == "False") {
        steroidElement = await page.waitForSelector('input[title="no"][name="steroid"]');
        await steroidElement.click();
      }
    }
    catch {
      console.log("failed");
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
            hospital_range_active_treatment = spanElements.eq(3).text();
            average_survival_not_active_treatment = spanElements.eq(5).text();
            hospital_range_not_active_treatment = spanElements.eq(7).text();

          } else {
            console.error("Error: Second span element not found");
          }
        } else {
          console.error("Error: rate-wrap div not found");
        }

        const flexWrapDiv = outcomesDiv.find('div.flex-wrapper');
        const spanElements2 = flexWrapDiv.find('span');

        profound_neurodevelopmental = spanElements2.eq(1).text();
        moderate_severe_neurodevelopmental = spanElements2.eq(3).text();
        blindness = spanElements2.eq(5).text();
        deafness = spanElements2.eq(7).text();
        moderate_severe_cerebral_palsy = spanElements2.eq(9).text()
        cognitive_developmental_delay = spanElements2.eq(11).text()

      } else {
        console.error("Error: outcomes div not found");
      }
    } else {
      console.error("Error: grid-results div not found");
    }

    // Log the extracted information
    //console.log('Extracted Information:', average_survival_active_treatment);
    //return average_survival_active_treatment;
    console.log('Extracted Information:',
    "average_survival_active_treatment: ",average_survival_active_treatment,
      "\nhospital_range_active_treatment: ", hospital_range_active_treatment,
      "\naverage_survival_not_active_treatment: ", coverage_survival_not_active_treatment,
      "\nhospital_range_not_active_treatment: ", hospital_range_not_active_treatment,
      "\nprofound_neurodevelopmental: ", profound_neurodevelopmental,
      "\nmoderate_severe_cerebral_palsy: ",moderate_severe_cerebral_palsy,
      "\nblindness: ", blindness, 
      "\ndeafness: ", deafness, 
      "\nmoderate_severe_neurodevelopmental: ",moderate_severe_neurodevelopmental,
      "\ncognitive_developmental_delay: ", cognitive_developmental_delay)
    return [average_survival_active_treatment,
      hospital_range_active_treatment,
      average_survival_not_active_treatment,
      hospital_range_not_active_treatment,
      profound_neurodevelopmental,
      moderate_severe_cerebral_palsy,
      blindness,
      deafness,
      moderate_severe_neurodevelopmental,
      cognitive_developmental_delay];

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

//  // a test of the function.
(async () => {
  const gestationalAge = 22;
  const birthWeight = 401;

  //0 or 1 for buttons as they appear on page (0 is male, yes, yes)
  const sex = "Male";
  const singleton = "False";
  const steroid = "False";

  const results = await getEpboResults(gestationalAge, birthWeight, sex, singleton, steroid);
  console.log(results);
})();

module.exports = {getEpboResults};