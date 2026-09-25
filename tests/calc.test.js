/* Run with: node tests/calc.test.js */
'use strict';
require('../assets/js/calcwise.js');
const CW = globalThis.CalcWise;

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; } else { failures++; console.log('FAIL', name, detail === undefined ? '' : detail); }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 0.01 : tol); }
function finite(o) { return Object.values(o).every(v => typeof v !== 'number' || Number.isFinite(v)); }

// Independent reference EMI (closed form, written separately from the core).
function refEmi(P, annual, n) { const r = annual / 12 / 100; const f = (1 + r) ** n; return P * r * f / (f - 1); }

const cases = [
  { name: 'Case 1: ₹10L @ 8.5% × 10y', P: 1000000, R: 8.5, n: 120 },
  { name: 'Case 2: ₹30L @ 8.5% × 20y', P: 3000000, R: 8.5, n: 240 },
  { name: 'Case 3: ₹50L @ 9% × 15y', P: 5000000, R: 9, n: 180 },
  { name: 'Case 4: ₹1L @ 5% × 1y', P: 100000, R: 5, n: 12 },
  { name: 'Case 5: ₹10Cr @ 18% × 30y', P: 100000000, R: 18, n: 360 },
  { name: 'Default: ₹50L @ 8.5% × 20y', P: 5000000, R: 8.5, n: 240 },
  { name: 'Min: ₹10k @ 1% × 1m', P: 10000, R: 1, n: 1 },
];

const table = [];
for (const c of cases) {
  const s = CW.amortize({ principal: c.P, annualRate: c.R, months: c.n, startDate: new Date(2026, 9, 1) });
  const e = refEmi(c.P, c.R, c.n);
  check(c.name + ' EMI', near(s.emi, e, 1e-6), [s.emi, e]);
  check(c.name + ' months', s.months === c.n, s.months);
  check(c.name + ' principal sums to P', near(s.totalPrincipal, c.P, 0.01), s.totalPrincipal);
  check(c.name + ' interest = paid − P', near(s.totalInterest, s.totalPaid - c.P, 0.01), [s.totalInterest, s.totalPaid - c.P]);
  check(c.name + ' interest = EMI×n − P', near(s.totalInterest, e * c.n - c.P, 0.05), [s.totalInterest, e * c.n - c.P]);
  check(c.name + ' final balance 0', s.rows[s.rows.length - 1].closing === 0);
  check(c.name + ' no negatives / NaN', s.rows.every(r => finite(r) && r.interest >= 0 && r.principal >= 0 && r.closing >= 0 && r.emi > 0));
  const k = Math.max(1, Math.floor(c.n / 2));
  check(c.name + ' balanceAfter matches schedule', near(CW.balanceAfter(c.P, c.R, c.n, k), s.rows[k - 1].closing, 0.05));
  table.push({ case: c.name, EMI: CW.formatINR(s.emi), exactEMI: s.emi.toFixed(2), interest: CW.formatINR(s.totalInterest), total: CW.formatINR(s.totalPaid) });
}
console.table(table);

// Known published value: ₹10L @ 8.5% for 10 years → ₹12,399 (rounded).
check('Case 1 rounded EMI ₹12,399', CW.formatINR(CW.emi(1000000, 8.5, 120)) === '₹12,399', CW.formatINR(CW.emi(1000000, 8.5, 120)));
check('Case 2 rounded EMI ₹26,035', CW.formatINR(CW.emi(3000000, 8.5, 240)) === '₹26,035');
check('Case 3 rounded EMI ₹50,713', CW.formatINR(CW.emi(5000000, 9, 180)) === '₹50,713', CW.formatINR(CW.emi(5000000, 9, 180)));
check('Case 4 rounded EMI ₹8,561', CW.formatINR(CW.emi(100000, 5, 12)) === '₹8,561', CW.formatINR(CW.emi(100000, 5, 12)));

// Prepayment engine
const base = CW.amortize({ principal: 5000000, annualRate: 8.5, months: 240 });
const scenarios = [
  ['onetime tenure', { type: 'onetime', amount: 500000, startMonth: 12, mode: 'tenure' }],
  ['onetime emi', { type: 'onetime', amount: 500000, startMonth: 12, mode: 'emi' }],
  ['monthly tenure', { type: 'monthly', amount: 5000, startMonth: 1, mode: 'tenure' }],
  ['monthly emi', { type: 'monthly', amount: 5000, startMonth: 1, mode: 'emi' }],
  ['yearly tenure', { type: 'yearly', amount: 100000, startMonth: 12, mode: 'tenure' }],
  ['yearly emi', { type: 'yearly', amount: 100000, startMonth: 12, mode: 'emi' }],
  ['onetime month 1', { type: 'onetime', amount: 500000, startMonth: 1, mode: 'tenure' }],
  ['onetime month 60', { type: 'onetime', amount: 500000, startMonth: 60, mode: 'tenure' }],
  ['prepay > balance', { type: 'onetime', amount: 90000000, startMonth: 1, mode: 'tenure' }],
];
const ptable = [];
for (const [name, prepay] of scenarios) {
  const s = CW.amortize({ principal: 5000000, annualRate: 8.5, months: 240, prepay });
  const saved = base.totalInterest - s.totalInterest;
  check(name + ' principal+prepaid = P', near(s.totalPrincipal + s.totalPrepaid, 5000000, 0.05), s.totalPrincipal + s.totalPrepaid);
  check(name + ' paid − P = interest', near(s.totalPaid - 5000000, s.totalInterest, 0.05));
  check(name + ' saves interest', saved > 0, saved);
  check(name + ' no NaN/negative', s.rows.every(r => finite(r) && r.closing >= 0 && r.emi >= 0 && r.prepayment >= 0));
  if (prepay.mode === 'tenure') check(name + ' shorter tenure', s.months < 240, s.months);
  if (prepay.mode === 'emi') {
    check(name + ' keeps tenure', s.months === 240, s.months);
    check(name + ' lower EMI', s.lastEmi < base.emi, s.lastEmi);
  }
  ptable.push({ scenario: name, months: s.months, interest: CW.formatINR(s.totalInterest), saved: CW.formatINR(saved), prepaid: CW.formatINR(s.totalPrepaid), lastEmi: CW.formatINR(s.lastEmi) });
}
console.table(ptable);
// Earlier prepayment saves more
const early = CW.amortize({ principal: 5000000, annualRate: 8.5, months: 240, prepay: { type: 'onetime', amount: 500000, startMonth: 1, mode: 'tenure' } });
const late = CW.amortize({ principal: 5000000, annualRate: 8.5, months: 240, prepay: { type: 'onetime', amount: 500000, startMonth: 60, mode: 'tenure' } });
check('earlier prepayment saves more', early.totalInterest < late.totalInterest);
// One-time prepayment reduces balance by exactly the amount in that month
const ot = CW.amortize({ principal: 5000000, annualRate: 8.5, months: 240, prepay: { type: 'onetime', amount: 500000, startMonth: 12, mode: 'tenure' } });
check('prepayment month 12 recorded', ot.rows[11].prepayment === 500000 && ot.rows.filter(r => r.prepayment > 0).length === 1);
check('balance matches base − 5L at m12', near(ot.rows[11].closing, base.rows[11].closing - 500000, 0.01));

// Zero-interest edge (not reachable via UI limits but must not break)
const z = CW.amortize({ principal: 120000, annualRate: 0, months: 12 });
check('0% rate EMI', near(z.emi, 10000) && near(z.totalInterest, 0));

// Invalid maths inputs never yield NaN in schedules
check('emi(0) NaN guarded', CW.amortize({ principal: 0, annualRate: 8, months: 12 }) === null);
check('emi(neg) NaN guarded', CW.amortize({ principal: -5, annualRate: 8, months: 12 }) === null);

// Effective annual rate
check('APR = rate when no fee', near(CW.effectiveAnnualRate(5000000, CW.emi(5000000, 8.5, 240), 240), 8.5, 1e-6));
const apr = CW.effectiveAnnualRate(5000000 - 29500, CW.emi(5000000, 8.5, 240), 240);
check('APR > rate with fee', apr > 8.5 && apr < 8.7, apr);

// Year grouping
const g = CW.groupByYear(CW.amortize({ principal: 1000000, annualRate: 8.5, months: 120, startDate: new Date(2026, 9, 1) }).rows, 'fy', 1000000);
check('FY first label', g[0].label === 'FY 2026-27' && g[0].rows.length === 6, g[0].label + ' ' + g[0].rows.length);
check('FY paid% ends 100', near(g[g.length - 1].paidPct, 100, 1e-6));
const gc = CW.groupByYear(CW.amortize({ principal: 1000000, annualRate: 8.5, months: 120, startDate: new Date(2026, 9, 1) }).rows, 'cal', 1000000);
check('Calendar first label', gc[0].label === '2026' && gc[0].rows.length === 3);
check('Calendar group sums', near(gc.reduce((a, x) => a + x.principal, 0), 1000000, 0.01));

// Validation
const V = (k, raw, lim) => CW.validate(k, raw, lim);
check('blank amount', V('amount', '').error === 'Please enter a loan amount.');
check('negative amount', V('amount', '-5000').error === 'Loan amount must be greater than zero.');
check('zero amount', V('amount', '0').error === 'Loan amount must be greater than zero.');
check('letters amount', /valid loan amount/.test(V('amount', 'abc').error));
check('mixed amount', /valid loan amount/.test(V('amount', '12abc').error));
check('exp notation rejected', !!V('amount', '1e7').error);
check('comma amount', V('amount', '50,00,000').value === 5000000);
check('₹ prefix amount', V('amount', '₹ 25,00,000').value === 2500000);
check('decimal amount', V('amount', '150000.50').value === 150000.5);
check('too large amount', /between/.test(V('amount', '1000000001').error));
check('too small amount', /between/.test(V('amount', '500').error));
check('Infinity rejected', !!V('amount', 'Infinity').error);
check('rate 8.5%', V('rate', '8.5%').value === 8.5);
check('rate blank', V('rate', ' ').error === 'Please enter an interest rate.');
check('rate invalid', V('rate', '8..5').error === 'Please enter a valid interest rate.');
check('rate high', /between 1% and 30%/.test(V('rate', '45').error));
check('years decimal', /whole number/.test(V('years', '2.5').error));
check('years 31', /between 1 and 30 years/.test(V('years', '31').error));
check('months 360', V('months', '360').value === 360);
check('months 361', !!V('months', '361').error);
check('fee 0 ok', V('fee', '0').value === 0);
check('fee neg', V('fee', '-1').error === 'Processing fee cannot be negative.');
check('prepay max', /cannot exceed/.test(V('prepay', '600000', { min: 1, max: 500000 }).error));

// Formatting
check('INR format', CW.formatINR(12345678.4) === '₹1,23,45,678');
check('INR NaN', CW.formatINR(NaN) === '—' && CW.formatINR(Infinity) === '—');
check('no -0', CW.formatINR(-0.2) === '₹0');
check('short L', CW.formatShortINR(2500000) === '₹25.00 L');
check('short Cr', CW.formatShortINR(123000000) === '₹12.30 Cr');
check('tenure fmt', CW.formatTenure(245) === '20 yrs 5 mos' && CW.formatTenure(8) === '8 mos' && CW.formatTenure(12) === '1 yr');

// Year rows (rounded to rupees) must add up exactly to the rounded loan totals.
for (const c of cases) {
  for (const basis of ['cal', 'fy']) {
    for (const prepay of [undefined, { type: 'yearly', amount: 100000, startMonth: 12, mode: 'tenure' }]) {
      const s = CW.amortize({ principal: c.P, annualRate: c.R, months: c.n, startDate: new Date(2026, 9, 1), prepay });
      const gy = CW.groupByYear(s.rows, basis, c.P);
      const sum = k => gy.reduce((t, x) => t + x[k], 0);
      const tag = c.name + ' ' + basis + (prepay ? ' +prepay' : '');
      check(tag + ' year interest sums to total', sum('interest') === Math.round(s.totalInterest), [sum('interest'), Math.round(s.totalInterest)]);
      check(tag + ' year principal+prepay sums to P', sum('principal') + sum('prepayment') === Math.round(c.P), sum('principal') + sum('prepayment'));
      check(tag + ' year paid sums to total paid', sum('paid') === Math.round(s.totalPaid), [sum('paid'), Math.round(s.totalPaid)]);
      check(tag + ' year values are whole rupees', gy.every(x => Number.isInteger(x.principal) && Number.isInteger(x.interest) && x.interest >= 0 && x.principal >= 0));
    }
  }
}

// Reduce-EMI mode exposes the EMI after the first prepayment as well as after the last one.
const re1 = CW.amortize({ principal: 5000000, annualRate: 8.5, months: 240, prepay: { type: 'onetime', amount: 500000, startMonth: 12, mode: 'emi' } });
check('onetime emi: one revision', re1.emiRevisions === 1 && near(re1.firstRevisedEmi, re1.lastEmi, 1e-9));
check('onetime emi: revised EMI = EMI on balance over remaining term', near(re1.firstRevisedEmi, CW.emi(re1.rows[11].closing, 8.5, 228), 1e-6));
check('onetime emi: revised EMI actually charged', near(re1.rows[12].emi, re1.firstRevisedEmi, 1e-6));
const re2 = CW.amortize({ principal: 5000000, annualRate: 8.5, months: 240, prepay: { type: 'monthly', amount: 5000, startMonth: 1, mode: 'emi' } });
check('monthly emi: many revisions', re2.emiRevisions > 200, re2.emiRevisions);
check('monthly emi: first revision > last', re2.firstRevisedEmi > re2.lastEmi && re2.firstRevisedEmi < re2.emi, [re2.firstRevisedEmi, re2.lastEmi]);
check('monthly emi: first revision is month-2 EMI', near(re2.rows[1].emi, re2.firstRevisedEmi, 1e-6));
const re3 = CW.amortize({ principal: 5000000, annualRate: 8.5, months: 240, prepay: { type: 'onetime', amount: 500000, startMonth: 12, mode: 'tenure' } });
check('tenure mode: no revisions', re3.emiRevisions === 0 && near(re3.firstRevisedEmi, re3.emi, 1e-9));

// Validation message is derived from config.
check('amount range message', CW.validate('amount', '999999999999').error === 'Loan amount must be between ₹10,000 and ₹10,00,00,000 (₹10 crore).', CW.validate('amount', '999999999999').error);

// Log slider round trip covers both ends
check('slider min', CW.posToAmount(0) === 10000);
check('slider max', CW.posToAmount(CW.SLIDER_STEPS) === 100000000);
check('slider monotonic', (() => { let p = 0; for (let i = 0; i <= 1000; i++) { const v = CW.posToAmount(i); if (v < p) return false; p = v; } return true; })());
check('slider roundtrip 50L', Math.abs(CW.posToAmount(CW.amountToPos(5000000)) - 5000000) / 5000000 < 0.02);

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
