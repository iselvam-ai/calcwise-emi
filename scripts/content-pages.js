#!/usr/bin/env node
/* Generates the simple content pages (about, contact, legal, 404) from one template.
 * Usage: node scripts/content-pages.js && node scripts/sync-partials.js */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://calcwise-emi.vercel.app';
const UPDATED = '25 September 2026';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page({ file, title, h1, description, eyebrow, body, noindex }) {
  const url = file === '404.html' ? null : `${SITE}/${file}`;
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${url ? `<link rel="canonical" href="${url}">\n` : ''}<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}">
<meta name="theme-color" content="#070235">
<!-- CW:HEAD START -->
<!-- CW:HEAD END -->
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${url ? `<meta property="og:url" content="${url}">\n` : ''}<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<script src="/assets/js/calcwise.js" defer></script>
</head>
<body class="bg-surface font-body-md text-on-surface antialiased">
<!-- CW:HEADER START -->
<!-- CW:HEADER END -->
<main id="main" class="w-full pt-16 bg-surface min-h-[calc(100vh-4rem)]">
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
    <p class="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold mb-2">${esc(eyebrow)}</p>
    <h1 class="font-headline-xl-mobile text-headline-xl-mobile sm:font-headline-xl sm:text-headline-xl text-primary font-extrabold tracking-tight mb-6">${esc(h1)}</h1>
    <div class="prose-cw font-body-lg text-body-lg text-on-surface-variant">
${body.trim()}
    </div>
  </div>
</main>
<!-- CW:FOOTER START -->
<!-- CW:FOOTER END -->
</body>
</html>
`;
}

const updated = `<p class="font-body-sm text-body-sm">Last updated: ${UPDATED}</p>`;
const pages = [
  {
    file: 'about.html', eyebrow: 'About', title: 'About CalcWise – Free Loan Calculators for India',
    h1: 'About CalcWise',
    description: 'CalcWise is a set of free, browser-based loan calculators for Indian borrowers: EMI, loan prepayment and loan comparison.',
    body: `
<p>CalcWise is a small set of free loan calculators for Indian borrowers, built by <a href="https://nidspace.com" target="_blank" rel="noopener">NidSpace<span class="sr-only"> (opens in a new tab)</span></a>. It currently includes:</p>
<ul>
  <li><a href="/emi-calculator.html">EMI Calculator</a> — monthly EMI, total interest, processing fee with GST, and an amortization schedule by calendar or financial year.</li>
  <li><a href="/prepayment.html">Loan Prepayment Calculator</a> — the effect of one-time, monthly or yearly prepayments on tenure, EMI and interest.</li>
  <li><a href="/loan-comparison.html">Loan Comparison Calculator</a> — two loan offers side by side, including fees and an approximate effective annual rate.</li>
</ul>
<h2>How the calculations work</h2>
<p>CalcWise uses the standard monthly reducing-balance EMI formula: EMI = P × r × (1+r)<sup>n</sup> ÷ ((1+r)<sup>n</sup> − 1), where P is the loan amount, r is the monthly interest rate and n is the number of monthly EMIs. Calculations use standard EMI amortization mathematics. Actual lender schedules may vary because of lender-specific rounding, dates, fees, rate changes and other terms.</p>
<h2>What CalcWise is not</h2>
<p>CalcWise provides calculations and general educational information. It is not a lender, does not arrange loans, and does not give personalised financial, tax or legal advice. Interest rates shown as examples are illustrative and are not quotes from any lender.</p>
<h2>Privacy</h2>
<p>There is no sign-up. Calculations run in your browser and the numbers you enter are not sent to a CalcWise server. See the <a href="/privacy.html">Privacy Policy</a>.</p>`
  },
  {
    file: 'contact.html', eyebrow: 'Contact', title: 'Contact – CalcWise',
    h1: 'Contact',
    description: 'How to contact the team behind CalcWise.',
    body: `
<p>CalcWise is a product of NidSpace. For feedback, bug reports or questions about CalcWise, please contact NidSpace through <a href="https://nidspace.com" target="_blank" rel="noopener">nidspace.com<span class="sr-only"> (opens in a new tab)</span></a>.</p>
<p>If you are reporting a calculation issue, it helps to include the loan amount, interest rate, tenure and any prepayment or fee settings you used — the <strong>Share Link</strong> button on each calculator copies a link that contains exactly these inputs.</p>
<p>CalcWise cannot help with individual loan applications, lender disputes or personal financial advice. For those, please contact your lender or a qualified professional.</p>`
  },
  {
    file: 'disclaimer.html', eyebrow: 'Legal', title: 'Disclaimer – CalcWise',
    h1: 'Disclaimer',
    description: 'CalcWise provides calculations and general educational information. Results are estimates and may differ from lender calculations.',
    body: `
${updated}
<p>CalcWise provides financial calculations and general educational information. Results are estimates and may differ from actual lender calculations. Users should verify loan terms, interest rates, fees, taxes and eligibility directly with the lender or a qualified professional.</p>
<h2>Calculation method</h2>
<p>Calculations use standard EMI amortization mathematics (monthly reducing balance). Actual lender schedules may vary because of lender-specific rounding, dates, broken-period interest, fees, rate changes (for example, on floating-rate loans) and other terms. Amounts are shown rounded to the nearest rupee.</p>
<h2>Interest rates</h2>
<p>Any interest rates shown as quick examples are illustrative only. They are not current rates from any lender. Rates shown are illustrative and should be verified with the lender.</p>
<h2>Prepayment charges</h2>
<p>Prepayment charges depend on the loan type, lender and applicable regulations. Certain floating-rate loans to individual borrowers may have exemptions from prepayment charges under applicable RBI rules. Verify the current terms with your lender. The calculators do not include prepayment charges.</p>
<h2>Fees and GST</h2>
<p>Processing fees and GST are calculated only from the percentages you enter. Other charges (for example legal, valuation, insurance or stamp duty) are not included.</p>
<h2>Tax information</h2>
<p>Tax information is provided for general reference only. Eligibility, limits and applicability depend on the applicable Income Tax rules, tax regime and individual circumstances. Consult a qualified tax professional for advice.</p>
<h2>No advice</h2>
<p>Nothing on CalcWise is personalised financial, investment, tax or legal advice, or a recommendation to take any loan or make any prepayment. Interest saved through prepayment is a reduction in the interest payable on a loan; it is not an investment return.</p>`
  },
  {
    file: 'privacy.html', eyebrow: 'Legal', title: 'Privacy Policy – CalcWise',
    h1: 'Privacy Policy',
    description: 'CalcWise has no accounts and does not send your calculator inputs to its servers. Read what data is and is not collected.',
    body: `
${updated}
<h2>Your calculator inputs</h2>
<p>All CalcWise calculations run in your web browser. The loan amounts, rates, tenures and other values you enter are not sent to or stored on a CalcWise server. CalcWise does not set cookies, does not use browser storage, and does not include analytics or advertising scripts. There are no user accounts.</p>
<h2>Share links</h2>
<p>If you use a <strong>Share Link</strong> button, the link contains your calculator inputs (for example loan amount and interest rate) in the web address. Anyone you share it with can see those values, and they may appear in browser history or in the hosting provider's request logs when the link is opened. Do not share links containing information you consider private.</p>
<h2>Exports</h2>
<p>PDF (via your browser's print dialog) and CSV files are generated on your device and are not uploaded anywhere by CalcWise.</p>
<h2>Third-party services</h2>
<ul>
  <li><strong>Hosting:</strong> the site is hosted on Vercel. Like any web host, Vercel processes technical request data (such as IP address, browser type and requested page) to deliver the site and keep it secure.</li>
  <li><strong>Fonts:</strong> fonts and icons are loaded from Google Fonts (fonts.googleapis.com and fonts.gstatic.com). Your browser connects to Google to download them, which shares your IP address and browser information with Google.</li>
</ul>
<h2>Changes</h2>
<p>If this policy changes, the updated version will be posted on this page with a new date.</p>
<h2>Contact</h2>
<p>See the <a href="/contact.html">Contact</a> page.</p>`
  },
  {
    file: 'terms.html', eyebrow: 'Legal', title: 'Terms of Use – CalcWise',
    h1: 'Terms of Use',
    description: 'Terms for using the free CalcWise loan calculators.',
    body: `
${updated}
<p>By using CalcWise you agree to these terms. If you do not agree, please do not use the site.</p>
<h2>Use of the calculators</h2>
<p>CalcWise is provided free of charge for personal, informational use. You may use the results for your own planning and share them with others.</p>
<h2>No advice and no guarantee</h2>
<p>CalcWise provides financial calculations and general educational information. Results are estimates and may differ from actual lender calculations. Verify loan terms, interest rates, fees, taxes and eligibility directly with the lender or a qualified professional. See the <a href="/disclaimer.html">Disclaimer</a>.</p>
<h2>Availability</h2>
<p>The site is provided "as is". It may change, be unavailable or contain errors. NidSpace may update, add or remove features at any time.</p>
<h2>Limitation of liability</h2>
<p>To the extent permitted by law, NidSpace is not liable for any loss arising from reliance on the calculations or information on CalcWise.</p>
<h2>Changes to these terms</h2>
<p>These terms may be updated from time to time. The date above shows when they were last changed.</p>`
  },
  {
    file: '404.html', eyebrow: 'Error 404', title: 'Page not found – CalcWise', noindex: true,
    h1: 'Page not found',
    description: 'The page you were looking for does not exist.',
    body: `
<p>Sorry, that page doesn't exist or has moved. Try one of these:</p>
<ul>
  <li><a href="/">Home</a></li>
  <li><a href="/emi-calculator.html">EMI Calculator</a></li>
  <li><a href="/prepayment.html">Loan Prepayment Calculator</a></li>
  <li><a href="/loan-comparison.html">Loan Comparison Calculator</a></li>
</ul>`
  }
];

for (const p of pages) fs.writeFileSync(path.join(ROOT, p.file), page(p));
console.log('Wrote', pages.map(p => p.file).join(', '));
