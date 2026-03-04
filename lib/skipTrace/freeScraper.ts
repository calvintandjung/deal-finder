/**
 * YOLO Skip Trace - Free Scrapers
 * 
 * WARNING: These scrapers violate TOS of various sites.
 * Use at your own risk. For personal use only.
 * 
 * Calvin said: "TOS be damned - this is for personal use, not commercial"
 */

import puppeteer from 'puppeteer';

export interface ScraperResult {
  phones: string[];
  emails: string[];
  relatives: string[];
  addresses: string[];
  source: string;
  success: boolean;
  error?: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Launch headless browser
 */
async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ],
  });
  return browser;
}

/**
 * TruePeopleSearch.com Scraper
 * 
 * Flow:
 * 1. Search by name + city/state
 * 2. Parse results page
 * 3. Extract phone, email, relatives
 */
export async function scrapeTruePeopleSearch(
  name: string,
  city: string,
  state: string
): Promise<ScraperResult> {
  const result: ScraperResult = {
    phones: [],
    emails: [],
    relatives: [],
    addresses: [],
    source: 'TruePeopleSearch',
    success: false,
  };

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent(getRandomUserAgent());
    
    // Build search URL
    const searchUrl = `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(name)}&citystatezip=${encodeURIComponent(city + ', ' + state)}`;
    
    console.log('[TruePeopleSearch] Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for results
    await delay(2000);
    
    // Extract phone numbers
    const phones = await page.evaluate(() => {
      const phoneElements = document.querySelectorAll('a[href^="tel:"]');
      const numbers: string[] = [];
      phoneElements.forEach(el => {
        const href = el.getAttribute('href');
        if (href) {
          const number = href.replace('tel:', '').trim();
          if (number && !numbers.includes(number)) {
            numbers.push(number);
          }
        }
      });
      return numbers;
    });
    
    // Extract emails
    const emails = await page.evaluate(() => {
      const emailElements = document.querySelectorAll('a[href^="mailto:"]');
      const addresses: string[] = [];
      emailElements.forEach(el => {
        const href = el.getAttribute('href');
        if (href) {
          const email = href.replace('mailto:', '').trim();
          if (email && !addresses.includes(email)) {
            addresses.push(email);
          }
        }
      });
      return addresses;
    });
    
    // Extract relatives
    const relatives = await page.evaluate(() => {
      const relativeElements = document.querySelectorAll('.relatives-list a, .relative-name');
      const names: string[] = [];
      relativeElements.forEach(el => {
        const name = el.textContent?.trim();
        if (name && !names.includes(name)) {
          names.push(name);
        }
      });
      return names;
    });
    
    // Extract addresses
    const addresses = await page.evaluate(() => {
      const addressElements = document.querySelectorAll('.address-link, .address');
      const addrs: string[] = [];
      addressElements.forEach(el => {
        const addr = el.textContent?.trim();
        if (addr && !addrs.includes(addr)) {
          addrs.push(addr);
        }
      });
      return addrs;
    });
    
    result.phones = phones;
    result.emails = emails;
    result.relatives = relatives;
    result.addresses = addresses;
    result.success = phones.length > 0 || emails.length > 0;
    
    console.log(`[TruePeopleSearch] Found: ${phones.length} phones, ${emails.length} emails`);
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error('[TruePeopleSearch] Error:', result.error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return result;
}

/**
 * FastPeopleSearch.com Scraper
 */
export async function scrapeFastPeopleSearch(
  name: string,
  city: string,
  state: string
): Promise<ScraperResult> {
  const result: ScraperResult = {
    phones: [],
    emails: [],
    relatives: [],
    addresses: [],
    source: 'FastPeopleSearch',
    success: false,
  };

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    await page.setUserAgent(getRandomUserAgent());
    
    // FastPeopleSearch has format: /name/{first}-{last}/{city}-{state}
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join('-');
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const stateCode = state.toUpperCase();
    
    const searchUrl = `https://www.fastpeoplesearch.com/name/${firstName}-${lastName}_${citySlug}-${stateCode}`;
    
    console.log('[FastPeopleSearch] Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await delay(2000);
    
    // Extract phone numbers
    const phones = await page.evaluate(() => {
      const phoneElements = document.querySelectorAll('.detail-box-phone, a[href^="tel:"]');
      const numbers: string[] = [];
      phoneElements.forEach(el => {
        const text = el.textContent?.trim() || el.getAttribute('href')?.replace('tel:', '');
        if (text) {
          const cleaned = text.replace(/\D/g, '');
          if (cleaned.length === 10 && !numbers.includes(cleaned)) {
            numbers.push(cleaned);
          }
        }
      });
      return numbers;
    });
    
    // Extract emails
    const emails = await page.evaluate(() => {
      const emailElements = document.querySelectorAll('.detail-box-email, a[href^="mailto:"]');
      const addresses: string[] = [];
      emailElements.forEach(el => {
        const email = el.textContent?.trim() || el.getAttribute('href')?.replace('mailto:', '');
        if (email && email.includes('@') && !addresses.includes(email)) {
          addresses.push(email);
        }
      });
      return addresses;
    });
    
    // Extract relatives
    const relatives = await page.evaluate(() => {
      const relativeElements = document.querySelectorAll('.detail-box-relative a, .relative-name');
      const names: string[] = [];
      relativeElements.forEach(el => {
        const name = el.textContent?.trim();
        if (name && !names.includes(name)) {
          names.push(name);
        }
      });
      return names;
    });
    
    result.phones = phones;
    result.emails = emails;
    result.relatives = relatives;
    result.success = phones.length > 0 || emails.length > 0;
    
    console.log(`[FastPeopleSearch] Found: ${phones.length} phones, ${emails.length} emails`);
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error('[FastPeopleSearch] Error:', result.error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return result;
}

/**
 * That'sThem.com Scraper
 */
export async function scrapeThatsThem(
  name: string,
  city: string,
  state: string
): Promise<ScraperResult> {
  const result: ScraperResult = {
    phones: [],
    emails: [],
    relatives: [],
    addresses: [],
    source: 'ThatsThem',
    success: false,
  };

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    await page.setUserAgent(getRandomUserAgent());
    
    const searchUrl = `https://thatsthem.com/name/${encodeURIComponent(name.replace(/\s+/g, '-'))}/${encodeURIComponent(city)}-${state}`;
    
    console.log('[ThatsThem] Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await delay(2000);
    
    // Extract data
    const phones = await page.evaluate(() => {
      const phoneElements = document.querySelectorAll('a[href^="tel:"], .phone-number');
      const numbers: string[] = [];
      phoneElements.forEach(el => {
        const text = el.textContent?.trim() || el.getAttribute('href')?.replace('tel:', '');
        if (text) {
          const cleaned = text.replace(/\D/g, '');
          if (cleaned.length === 10 && !numbers.includes(cleaned)) {
            numbers.push(cleaned);
          }
        }
      });
      return numbers;
    });
    
    const emails = await page.evaluate(() => {
      const emailElements = document.querySelectorAll('a[href^="mailto:"], .email-address');
      const addresses: string[] = [];
      emailElements.forEach(el => {
        const email = el.textContent?.trim() || el.getAttribute('href')?.replace('mailto:', '');
        if (email && email.includes('@') && !addresses.includes(email)) {
          addresses.push(email);
        }
      });
      return addresses;
    });
    
    result.phones = phones;
    result.emails = emails;
    result.success = phones.length > 0 || emails.length > 0;
    
    console.log(`[ThatsThem] Found: ${phones.length} phones, ${emails.length} emails`);
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error('[ThatsThem] Error:', result.error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return result;
}

/**
 * Aggregate results from all free sources
 * Runs scrapers in parallel, deduplicates results
 */
export async function aggregateFreeSources(
  name: string,
  city: string,
  state: string
): Promise<{
  phones: string[];
  emails: string[];
  relatives: string[];
  addresses: string[];
  sources_used: string[];
}> {
  console.log(`[FreeScraper] Starting aggregation for: ${name}, ${city}, ${state}`);
  
  // Run all scrapers in parallel
  const [truePeople, fastPeople, thatsThem] = await Promise.all([
    scrapeTruePeopleSearch(name, city, state).catch(err => ({
      phones: [],
      emails: [],
      relatives: [],
      addresses: [],
      source: 'TruePeopleSearch',
      success: false,
      error: err.message,
    })),
    scrapeFastPeopleSearch(name, city, state).catch(err => ({
      phones: [],
      emails: [],
      relatives: [],
      addresses: [],
      source: 'FastPeopleSearch',
      success: false,
      error: err.message,
    })),
    scrapeThatsThem(name, city, state).catch(err => ({
      phones: [],
      emails: [],
      relatives: [],
      addresses: [],
      source: 'ThatsThem',
      success: false,
      error: err.message,
    })),
  ]);
  
  // Deduplicate and aggregate
  const allPhones = new Set<string>();
  const allEmails = new Set<string>();
  const allRelatives = new Set<string>();
  const allAddresses = new Set<string>();
  const sourcesUsed: string[] = [];
  
  [truePeople, fastPeople, thatsThem].forEach(result => {
    if (result.success) {
      sourcesUsed.push(result.source);
    }
    result.phones.forEach(p => allPhones.add(p));
    result.emails.forEach(e => allEmails.add(e));
    result.relatives.forEach(r => allRelatives.add(r));
    result.addresses.forEach(a => allAddresses.add(a));
  });
  
  const aggregated = {
    phones: Array.from(allPhones),
    emails: Array.from(allEmails),
    relatives: Array.from(allRelatives),
    addresses: Array.from(allAddresses),
    sources_used: sourcesUsed,
  };
  
  console.log(`[FreeScraper] Aggregation complete: ${aggregated.phones.length} phones, ${aggregated.emails.length} emails from ${sourcesUsed.length} sources`);
  
  return aggregated;
}
