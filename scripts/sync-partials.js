#!/usr/bin/env node
/*
 * Keeps shared markup identical on every page (no runtime templating needed):
 *   <!-- CW:HEAD START/END -->    icons, social tags, fonts, stylesheet
 *   <!-- CW:HEADER START/END -->  site header + mobile navigation
 *   <!-- CW:FOOTER START/END -->  site footer + disclaimer
 * Also appends ?v=<content hash> to /assets css/js references (cache busting)
 * and subsets the Material Symbols font to the icons actually used.
 *
 * Usage: node scripts/sync-partials.js   (run after editing pages or assets)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://calcwise-emi.vercel.app';
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

const NAV = [
  ['/', 'index.html', 'Home'],
  ['/emi-calculator.html', 'emi-calculator.html', 'EMI Calculator'],
  ['/prepayment.html', 'prepayment.html', 'Prepayment'],
  ['/loan-comparison.html', 'loan-comparison.html', 'Loan Comparison'],
];

// Icons referenced from JavaScript (not visible in the HTML source).
const JS_ICONS = ['menu', 'close', 'chevron_right', 'expand_more'];

function hashOf(rel) {
  const file = path.join(ROOT, rel.replace(/^\//, ''));
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
}

function collectIcons() {
  const set = new Set(JS_ICONS);
  const re = /material-symbols-outlined[^"]*"[^>]*>\s*([a-z0-9_]+)\s*</g;
  for (const f of pages) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    let m;
    while ((m = re.exec(html))) set.add(m[1]);
  }
  return [...set].sort();
}

function head(icons) {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="CalcWise">',
    '<meta property="og:locale" content="en_IN">',
    `<meta property="og:image" content="${SITE}/assets/img/og-image.png">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="CalcWise – EMI, loan prepayment and loan comparison calculators">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image" content="${SITE}/assets/img/og-image.png">`,
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@600;700;800&amp;display=swap">',
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0&amp;icon_names=${icons.join(',')}&amp;display=block">`,
    '<link rel="stylesheet" href="/assets/css/site.css">',
  ].join('\n');
}

function header(file) {
  const links = NAV.map(([href, f, label]) =>
    `    <a href="${href}"${f === file ? ' aria-current="page"' : ''}>${label}</a>`).join('\n');
  return `<a class="skip-link" href="#main">Skip to main content</a>
<header class="site-header">
  <div class="site-header__inner">
    <a href="/" class="brand" aria-label="CalcWise home">Calc<span class="brand__accent">Wise</span></a>
    <nav class="site-nav" id="site-nav" aria-label="Main">
${links}
    </nav>
    <div class="header-end">
      <a href="https://nidspace.com" class="nidspace-link" target="_blank" rel="noopener">
        <img src="/assets/img/nidspace-logo.png" width="312" height="80" alt="NidSpace (opens in a new tab)">
      </a>
      <button type="button" class="nav-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Open menu">
        <span class="material-symbols-outlined" aria-hidden="true">menu</span>
      </button>
    </div>
  </div>
</header>`;
}

function footer() {
  const li = (href, label) => `<li><a class="hover:text-primary hover:underline" href="${href}">${label}</a></li>`;
  const h = t => `<h2 class="font-label-lg text-label-lg font-bold text-on-surface mb-space-md uppercase tracking-wider">${t}</h2>`;
  return `<footer class="site-footer w-full bg-surface-container-lowest border-t border-surface-container-high">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-space-2xl">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-xl">
      <div>
        <a href="/" class="brand">Calc<span class="brand__accent">Wise</span></a>
        <p class="font-label-lg text-label-lg font-semibold text-secondary mt-2 mb-space-xs">Calculate. Compare. Plan.</p>
        <p class="font-body-sm text-body-sm text-on-surface-variant">Free, browser-based loan calculators for Indian borrowers. A financial tools product by <a class="underline hover:text-primary" href="https://nidspace.com" target="_blank" rel="noopener">NidSpace<span class="sr-only"> (opens in a new tab)</span></a>.</p>
      </div>
      <nav aria-label="Calculators">
        ${h('Calculators')}
        <ul class="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
          ${li('/emi-calculator.html', 'EMI Calculator')}
          ${li('/prepayment.html', 'Prepayment Calculator')}
          ${li('/loan-comparison.html', 'Loan Comparison')}
        </ul>
      </nav>
      <nav aria-label="About CalcWise">
        ${h('CalcWise')}
        <ul class="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
          ${li('/about.html', 'About CalcWise')}
          ${li('/contact.html', 'Contact')}
        </ul>
      </nav>
      <nav aria-label="Legal">
        ${h('Legal')}
        <ul class="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
          ${li('/disclaimer.html', 'Disclaimer')}
          ${li('/privacy.html', 'Privacy Policy')}
          ${li('/terms.html', 'Terms of Use')}
        </ul>
      </nav>
    </div>
    <p class="mt-space-xl p-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant"><strong class="text-on-surface">Disclaimer:</strong> CalcWise provides financial calculations and general educational information. Results are estimates and may differ from actual lender calculations. Verify loan terms, interest rates, fees, taxes and eligibility directly with the lender or a qualified professional. CalcWise does not provide personalised financial, tax or legal advice.</p>
    <div class="mt-space-lg pt-space-lg border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
      <p>© 2026 NidSpace · CalcWise</p>
      <p>Calculations run in your browser.</p>
    </div>
  </div>
</footer>`;
}

function replaceBlock(html, name, content, file) {
  const re = new RegExp(`(<!-- CW:${name} START -->)[\\s\\S]*?(<!-- CW:${name} END -->)`);
  if (!re.test(html)) { console.warn(`  ! ${file}: missing CW:${name} markers`); return html; }
  return html.replace(re, `$1\n${content}\n$2`);
}

// 1) partials
const icons = collectIcons();
for (const f of pages) {
  const p = path.join(ROOT, f);
  let html = fs.readFileSync(p, 'utf8');
  html = replaceBlock(html, 'HEAD', head(icons), f);
  html = replaceBlock(html, 'HEADER', header(f), f);
  html = replaceBlock(html, 'FOOTER', footer(), f);
  fs.writeFileSync(p, html);
}
// 2) cache-busting hashes (after partials, so the stylesheet link exists)
for (const f of pages) {
  const p = path.join(ROOT, f);
  let html = fs.readFileSync(p, 'utf8');
  html = html.replace(/(["'])(\/assets\/(?:css|js)\/[\w.-]+\.(?:css|js))(?:\?v=[\w]+)?\1/g,
    (m, q, rel) => `${q}${rel}?v=${hashOf(rel)}${q}`);
  fs.writeFileSync(p, html);
}
console.log(`Synced ${pages.length} pages; ${icons.length} icons: ${icons.join(', ')}`);
