#!/usr/bin/env node
/* Generates the simple content pages (about, contact, legal, 404) from one template.
 * Usage: node scripts/content-pages.js && node scripts/sync-partials.js */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://emi.nidspace.com';
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
<p>CalcWise is a small set of free loan calculators for Indian borrowers, built by <a href="https://www.nidspace.com/" target="_blank" rel="noopener">NidSpace<span class="sr-only"> (opens in a new tab)</span></a>. It currently includes:</p>
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
    description: 'Send feedback, bug reports or questions about the CalcWise EMI, prepayment and loan comparison calculators to the NidSpace team.',
    body: `
<p>CalcWise is a product of NidSpace. For feedback, bug reports or questions about CalcWise, please contact NidSpace through <a href="https://www.nidspace.com/" target="_blank" rel="noopener">nidspace.com<span class="sr-only"> (opens in a new tab)</span></a>.</p>
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
    description: 'Terms for using the free CalcWise loan calculators: results are estimates for general information, not financial advice or a loan offer.',
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
    file: 'how-emi-is-calculated.html', eyebrow: 'Guide', title: 'How EMI Is Calculated – Formula and Worked Example',
    h1: 'How EMI is calculated',
    description: 'The EMI formula explained step by step with a worked example: how the monthly rate, tenure and principal combine, and why early EMIs are mostly interest.',
    body: `
${updated}
<p>An equated monthly instalment (EMI) is the fixed amount you pay each month to repay a loan. Each payment covers the interest for that month and the rest reduces the principal. The EMI stays the same for the whole tenure on a fixed-rate reducing-balance loan.</p>
<h2>The formula</h2>
<p>EMI = P × r × (1 + r)<sup>n</sup> ÷ ((1 + r)<sup>n</sup> − 1)</p>
<ul>
  <li><strong>P</strong> is the loan amount (principal).</li>
  <li><strong>r</strong> is the monthly interest rate: the annual rate ÷ 12 ÷ 100. For 8.5% a year, r = 0.085 ÷ 12 ≈ 0.0070833.</li>
  <li><strong>n</strong> is the number of monthly instalments. For 10 years, n = 120.</li>
</ul>
<h2>Worked example</h2>
<p>Take a ₹10,00,000 loan at 8.5% a year for 10 years (120 months):</p>
<ul>
  <li>Monthly EMI: about <strong>₹12,399</strong></li>
  <li>Total paid over 120 months: about ₹14,87,828</li>
  <li>Total interest: about <strong>₹4,87,828</strong></li>
  <li>First EMI: about ₹7,083 interest and ₹5,315 principal</li>
  <li>Last EMI: about ₹87 interest and ₹12,311 principal</li>
</ul>
<p>The first instalment is mostly interest because interest is charged on the full outstanding balance. As the balance falls, each instalment pays off more principal. This is why prepaying early saves more interest than prepaying near the end.</p>
<h2>What changes the EMI</h2>
<ul>
  <li><strong>A higher rate</strong> raises the EMI and the total interest.</li>
  <li><strong>A longer tenure</strong> lowers the EMI but raises the total interest, because the balance stays outstanding for longer.</li>
  <li><strong>A larger loan</strong> raises the EMI in proportion.</li>
</ul>
<h2>Try your own numbers</h2>
<p>Use the <a href="/emi-calculator.html">EMI Calculator</a> to see the monthly EMI, total interest and a year-wise schedule. To see how a lump-sum payment changes the result, try the <a href="/prepayment.html">Prepayment Calculator</a>.</p>
<h2>Note</h2>
<p>This is an illustration of the standard formula. Your lender's EMI may differ because of processing fees, rounding, rate resets or a different calculation method. Check the figures in your loan agreement. See the <a href="/disclaimer.html">Disclaimer</a>.</p>`
  },
  {
    file: 'home-loan-vs-personal-loan.html', eyebrow: 'Guide', title: 'Home Loan vs Personal Loan – Key Differences in India',
    h1: 'Home loan vs personal loan',
    description: 'Compare a home loan with a personal loan in India: security, interest rates, tenure, fees and tax treatment, and how to compare offers with the EMI calculator.',
    body: `
${updated}
<p>A home loan and a personal loan both give you a lump sum that you repay in monthly instalments, but they are built differently. The right one depends on what you are borrowing for and what you can offer as security.</p>
<h2>Main differences</h2>
<ul>
  <li><strong>Security.</strong> A home loan is secured against the property you buy. A personal loan is usually unsecured, so the lender relies on your income and credit history.</li>
  <li><strong>Interest rates.</strong> Because a home loan is secured, its rate is usually lower than a personal loan's rate for the same borrower.</li>
  <li><strong>Tenure.</strong> Home loans can run for up to 30 years in India. Personal loans are usually much shorter, often a few years.</li>
  <li><strong>Fees.</strong> Both can carry a processing fee, plus GST on that fee. Compare the total cost, not just the rate.</li>
  <li><strong>Tax treatment.</strong> Interest on a home loan may qualify for deductions under the Income Tax Act, subject to conditions and the tax regime you choose. Interest on a personal loan used for personal expenses generally does not. Check with a tax professional.</li>
</ul>
<h2>Compare with the same tools</h2>
<p>Enter both offers into the <a href="/loan-comparison.html">Loan Comparison Calculator</a>. It shows each EMI, total interest, processing fee with GST, total cost and the effective annual rate, which is the true cost once fees are included.</p>
<p>A shorter tenure on a personal loan can produce a higher EMI with less total interest, even at a higher rate. The <a href="/emi-calculator.html">EMI Calculator</a> lets you test different tenures on the same amount.</p>
<h2>Questions to ask the lender</h2>
<ul>
  <li>What is the annual rate, and is it fixed or floating?</li>
  <li>What is the processing fee, and what is the GST on it?</li>
  <li>Are there prepayment or foreclosure charges?</li>
  <li>What is the total amount payable over the full tenure?</li>
</ul>
<h2>Note</h2>
<p>This guide gives general information only. It is not a recommendation to take any loan. Lender terms, eligibility and tax rules vary. See the <a href="/disclaimer.html">Disclaimer</a>.</p>`
  },
  {
    file: 'what-is-effective-annual-rate.html', eyebrow: 'Guide', title: 'What Is Effective Annual Rate on a Loan? – Worked Example',
    h1: 'What is the effective annual rate?',
    description: 'Learn why a loan\'s effective annual rate can be higher than the stated interest rate once processing fees and GST are included, with a worked example.',
    body: `
${updated}
<p>The stated interest rate is only part of what a loan costs. Processing fees and GST on those fees reduce the amount you actually receive, while you still repay the full EMI. The effective annual rate is the rate that reflects that gap.</p>
<h2>Worked example</h2>
<p>Take a ₹10,00,000 loan at 8.5% a year for 10 years, with a 2% processing fee and 18% GST on the fee:</p>
<ul>
  <li>Processing fee: 2% of ₹10,00,000 = ₹20,000</li>
  <li>GST on the fee: 18% of ₹20,000 = ₹3,600</li>
  <li>Amount you actually receive: ₹10,00,000 − ₹23,600 = <strong>₹9,76,400</strong></li>
  <li>EMI: still about ₹12,399 a month, because it is based on the full ₹10,00,000 at 8.5%</li>
</ul>
<p>You repay as if you borrowed ₹10,00,000, but receive ₹9,76,400. Solving for the rate that makes the same EMI pay off ₹9,76,400 gives an effective annual rate of about <strong>9.06%</strong>, higher than the stated 8.5%.</p>
<h2>Why it matters</h2>
<p>Two loans with the same stated rate can cost different amounts once fees are added. A loan with a lower rate but a high fee can end up more expensive than one with a slightly higher rate and no fee. Comparing the effective annual rate puts both offers on the same basis.</p>
<h2>Calculate it yourself</h2>
<p>Enter the fee, the GST and both rates into the <a href="/loan-comparison.html">Loan Comparison Calculator</a>. It shows the effective annual rate for each offer, alongside the EMI and total cost.</p>
<h2>Note</h2>
<p>The effective annual rate in CalcWise is a calculation for comparison, based on the fee and GST you enter. It may differ from the figure your lender quotes if they include other charges. See the <a href="/disclaimer.html">Disclaimer</a>.</p>`
  },
  {
    file: '404.html', eyebrow: 'Error 404', title: 'Page not found – CalcWise', noindex: true,
    h1: 'Page not found',
    description: 'The page you were looking for does not exist. Use the CalcWise EMI, prepayment or loan comparison calculators instead.',
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
