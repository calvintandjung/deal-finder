/**
 * Inspect site HTML to find correct selectors
 */

import puppeteer from 'puppeteer'

async function inspect() {
  const browser = await puppeteer.launch({ headless: false }) // Show browser
  const page = await browser.newPage()
  
  console.log('Navigating to TruePeopleSearch...')
  await page.goto('https://www.truepeoplesearch.com/results?name=John%20Smith&citystatezip=Seattle%2C%20WA', {
    waitUntil: 'networkidle2',
    timeout: 30000
  })
  
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // Save HTML for inspection
  const html = await page.content()
  const fs = await import('fs')
  fs.writeFileSync('/tmp/truepeoplesearch.html', html)
  console.log('Saved HTML to /tmp/truepeoplesearch.html')
  
  // Check for phone/email elements
  const elements = await page.evaluate(() => {
    const results: any = {
      links: [] as string[],
      classes: [] as string[],
      sample: [] as string[]
    }
    
    // Find all links
    document.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || ''
      const text = a.textContent?.trim() || ''
      const classes = a.className
      
      if (href.includes('tel:') || href.includes('mailto:') || text.match(/\d{3}-\d{3}-\d{4}/)) {
        results.links.push(`${href} | ${text} | ${classes}`)
      }
    })
    
    // Find all elements with certain classes
    document.querySelectorAll('[class*="phone"], [class*="email"], [class*="contact"]').forEach(el => {
      results.classes.push(`${el.tagName}.${el.className} = "${el.textContent?.trim().substring(0, 50)}"`)
    })
    
    // Get first few result cards
    const cards = document.querySelectorAll('.card, .result, .person, [class*="search-result"]')
    cards.forEach((card, i) => {
      if (i < 3) {
        results.sample.push(card.className)
      }
    })
    
    return results
  })
  
  console.log('\n=== Found Elements ===')
  console.log('\nLinks with phone/email:')
  elements.links.slice(0, 10).forEach(l => console.log('  ' + l))
  
  console.log('\nPhone/Email/Contact classes:')
  elements.classes.slice(0, 10).forEach(c => console.log('  ' + c))
  
  console.log('\nResult card classes:')
  elements.sample.forEach(s => console.log('  ' + s))
  
  console.log('\n\nPress Ctrl+C when done inspecting...')
  await new Promise(() => {}) // Keep browser open
}

inspect().catch(console.error)
