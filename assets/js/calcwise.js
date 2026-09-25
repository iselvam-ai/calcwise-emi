/*!
 * CalcWise core — the single source of truth for calculator limits, defaults,
 * EMI / amortization maths, number formatting, validation, and shared UI
 * helpers (navigation, share links, CSV export, print / save-as-PDF reports).
 *
 * Everything runs in the browser. No input is sent to any server.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Configuration (see README.md → "Validation ranges" for rationale)
   * ------------------------------------------------------------------ */
  var CONFIG = {
    siteUrl: 'https://calcwise-emi.vercel.app',
    limits: {
      amount: { min: 10000, max: 100000000 }, // ₹10,000 – ₹10 crore
      rate: { min: 1, max: 30 },               // % per annum
      years: { min: 1, max: 30 },
      months: { min: 1, max: 360 },
      feePct: { min: 0, max: 10 }              // processing fee, % of loan
    },
    gstOnFeesPct: 18, // GST generally charged on processing fees in India
    defaults: { amount: 5000000, rate: 8.5, years: 20 },
    // Loan comparison starting scenario: same amount, different rate / tenure / fee.
    comparisonDefaults: {
      a: { amount: 5000000, rate: 8.5, years: 20, feePct: 0.5 },
      b: { amount: 5000000, rate: 9, years: 15, feePct: 0.25 }
    },
    // Starting values for the loan-type tabs. Illustrative, not lender quotes.
    loanTypes: {
      home: { amount: 5000000, rate: 8.5, years: 20 },
      personal: { amount: 500000, rate: 12, years: 5 },
      car: { amount: 800000, rate: 9.5, years: 7 }
    },
    // Quick-pick rates. Deliberately not tied to any lender name.
    illustrativeRates: [8, 8.5, 9, 10.5, 12],
    amountPresets: [1000000, 2500000, 5000000, 10000000],
    tenurePresetsYears: [5, 10, 15, 20, 30]
  };

  var TEXT = {
    rateNote: 'Illustrative rates — actual lender rates may vary. Verify current rates with the lender.',
    method: 'Calculations use standard EMI amortization mathematics. Actual lender schedules may vary because of lender-specific rounding, dates, fees, rate changes and other terms.',
    disclaimer: 'CalcWise provides financial calculations and general educational information. Results are estimates and may differ from actual lender calculations. Verify loan terms, interest rates, fees, taxes and eligibility directly with the lender or a qualified professional.',
    tax: 'Tax information is provided for general reference only. Eligibility, limits and applicability depend on the applicable Income Tax rules, tax regime and individual circumstances. Consult a qualified tax professional for advice.'
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ------------------------------------------------------------------ *
   * Formatting
   * ------------------------------------------------------------------ */
  var intFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  function formatNumber(n) {
    if (!isNum(n)) return '—';
    var r = Math.round(n);
    return intFmt.format(r === 0 ? 0 : r); // avoid "-0"
  }

  function formatINR(n) {
    if (!isNum(n)) return '—';
    var r = Math.round(n);
    return (r < 0 ? '-₹' : '₹') + intFmt.format(Math.abs(r));
  }

  /** ₹12.34 L / ₹1.23 Cr for large values, full rupees below one lakh. */
  function formatShortINR(n) {
    if (!isNum(n)) return '—';
    var a = Math.abs(n), sign = n < 0 ? '-' : '';
    if (a >= 1e7) return sign + '₹' + (a / 1e7).toFixed(2) + ' Cr';
    if (a >= 1e5) return sign + '₹' + (a / 1e5).toFixed(2) + ' L';
    return formatINR(n);
  }

  function formatPct(n, digits) {
    if (!isNum(n)) return '—';
    return n.toFixed(digits == null ? 1 : digits) + '%';
  }

  function formatRate(n) { return isNum(n) ? (Math.round(n * 100) / 100).toFixed(2) : ''; }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /** 245 → "20 yrs 5 mos" */
  function formatTenure(months) {
    if (!isNum(months) || months < 0) return '—';
    months = Math.round(months);
    var y = Math.floor(months / 12), m = months % 12, parts = [];
    if (y) parts.push(plural(y, 'yr', 'yrs'));
    if (m || !y) parts.push(plural(m, 'mo', 'mos'));
    return parts.join(' ');
  }

  /* ------------------------------------------------------------------ *
   * Dates
   * ------------------------------------------------------------------ */
  function firstOfNextMonth() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  function addMonths(date, k) { return new Date(date.getFullYear(), date.getMonth() + k, 1); }
  function monthLabel(date) { return MONTHS[date.getMonth()] + ' ' + date.getFullYear(); }
  function toMonthValue(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }
  function parseMonthValue(s) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2];
    if (y < 1990 || y > 2100 || mo < 1 || mo > 12) return null;
    return new Date(y, mo - 1, 1);
  }
  function yearLabel(date, basis) {
    var y = date.getFullYear();
    if (basis !== 'fy') return String(y);
    var fy = date.getMonth() >= 3 ? y : y - 1; // Indian FY: April – March
    return 'FY ' + fy + '-' + String(fy + 1).slice(-2);
  }

  /* ------------------------------------------------------------------ *
   * EMI maths — standard monthly reducing-balance amortization
   * EMI = P × r × (1+r)^n / ((1+r)^n − 1),  r = annual rate / 12 / 100
   * ------------------------------------------------------------------ */
  var EPS = 0.005; // half a paisa

  function emi(principal, annualRate, months) {
    if (!(principal > 0) || !(months > 0) || !(annualRate >= 0)) return NaN;
    var r = annualRate / 1200;
    if (r === 0) return principal / months;
    var f = Math.pow(1 + r, months);
    return principal * r * f / (f - 1);
  }

  function prepayApplies(p, m) {
    if (!p || p.type === 'none' || !(p.amount > 0)) return false;
    var start = p.startMonth || 1;
    if (m < start) return false;
    if (p.type === 'onetime') return m === start;
    if (p.type === 'monthly') return true;
    if (p.type === 'yearly') return (m - start) % 12 === 0;
    return false;
  }

  /**
   * Month-by-month schedule.
   * opts: { principal, annualRate, months, startDate?,
   *         prepay?: { type: 'none'|'onetime'|'monthly'|'yearly', amount, startMonth, mode: 'tenure'|'emi' } }
   * Prepayments are applied after that month's EMI. In 'tenure' mode the EMI
   * stays the same and the loan closes early; in 'emi' mode the EMI is
   * recomputed over the remaining original tenure.
   */
  function amortize(opts) {
    var P = opts.principal, R = opts.annualRate, n = Math.round(opts.months);
    var baseEmi = emi(P, R, n);
    if (!isNum(baseEmi)) return null;
    var r = R / 1200, start = opts.startDate || firstOfNextMonth(), prepay = opts.prepay;
    var payment = baseEmi, bal = P, rows = [], firstRevisedEmi = null, emiRevisions = 0;
    var tInt = 0, tPrin = 0, tPre = 0, tEmi = 0;

    for (var m = 1; m <= n && bal > EPS; m++) {
      var opening = bal, interest = bal * r;
      var pay = (m === n) ? bal + interest : Math.min(payment, bal + interest);
      var principalPart = pay - interest;
      bal -= principalPart;
      var extra = 0;
      if (bal > EPS && prepayApplies(prepay, m)) {
        extra = Math.min(prepay.amount, bal);
        bal -= extra;
      }
      if (bal < EPS) bal = 0;
      rows.push({
        month: m, date: addMonths(start, m - 1), opening: opening, emi: pay,
        interest: interest, principal: principalPart, prepayment: extra, closing: bal
      });
      tInt += interest; tPrin += principalPart; tPre += extra; tEmi += pay;
      if (extra > 0 && bal > 0 && prepay.mode === 'emi' && m < n) {
        payment = emi(bal, R, n - m);
        if (firstRevisedEmi === null) firstRevisedEmi = payment;
        emiRevisions++;
      }
    }

    return {
      rows: rows,
      emi: baseEmi,
      lastEmi: payment,
      // 'emi' mode only: EMI after the first prepayment, and how many times the EMI was recomputed.
      firstRevisedEmi: firstRevisedEmi === null ? payment : firstRevisedEmi,
      emiRevisions: emiRevisions,
      months: rows.length,
      principal: P,
      totalInterest: tInt,
      totalPrincipal: tPrin,
      totalPrepaid: tPre,
      totalEmiPaid: tEmi,
      totalPaid: tEmi + tPre,
      startDate: start,
      endDate: rows.length ? rows[rows.length - 1].date : start
    };
  }

  /** Outstanding balance after k regular EMIs (no prepayment). */
  function balanceAfter(principal, annualRate, months, k) {
    var r = annualRate / 1200, e = emi(principal, annualRate, months);
    if (k >= months) return 0;
    if (r === 0) return principal - e * k;
    var f = Math.pow(1 + r, k);
    return Math.max(0, principal * f - e * (f - 1) / r);
  }

  /** First month in which the principal part of the EMI exceeds the interest part. */
  function crossoverMonth(rows) {
    for (var i = 0; i < rows.length; i++) if (rows[i].principal >= rows[i].interest) return rows[i].month;
    return null;
  }

  /**
   * Annualised effective cost including upfront charges (APR-style):
   * the nominal annual rate at which the EMIs repay the amount actually
   * received (loan minus fees). Returns NaN when it cannot be determined.
   */
  function effectiveAnnualRate(netReceived, payment, months) {
    if (!(netReceived > 0) || !(payment > 0) || !(months > 0)) return NaN;
    if (payment * months <= netReceived) return 0;
    function pv(i) { return i === 0 ? payment * months : payment * (1 - Math.pow(1 + i, -months)) / i; }
    var lo = 0, hi = 1;
    for (var k = 0; k < 200; k++) {
      var mid = (lo + hi) / 2;
      if (pv(mid) > netReceived) lo = mid; else hi = mid;
      if (hi - lo < 1e-12) break;
    }
    return (lo + hi) / 2 * 1200;
  }

  /**
   * Group schedule rows by calendar year or Indian financial year.
   * Year totals are rounded to whole rupees cumulatively (each year = rounded
   * running total at its end − rounded running total at its start), so the
   * displayed year rows always add up exactly to the rounded loan totals.
   */
  function groupByYear(rows, basis, principal) {
    var groups = rawGroupByYear(rows, basis, principal);
    var run = { principal: 0, interest: 0, prepayment: 0 }, shown = { principal: 0, interest: 0, prepayment: 0 };
    groups.forEach(function (g) {
      ['principal', 'interest', 'prepayment'].forEach(function (k) {
        run[k] += g[k];
        var upTo = Math.round(run[k]);
        g[k] = upTo - shown[k];
        shown[k] = upTo;
      });
      g.paid = g.principal + g.interest + g.prepayment;
    });
    return groups;
  }

  function rawGroupByYear(rows, basis, principal) {
    var groups = [], map = {}, cumPaid = 0;
    rows.forEach(function (row) {
      var label = yearLabel(row.date, basis), g = map[label];
      if (!g) {
        g = map[label] = { label: label, rows: [], principal: 0, interest: 0, prepayment: 0, paid: 0, closing: 0, paidPct: 0 };
        groups.push(g);
      }
      g.rows.push(row);
      g.principal += row.principal;
      g.interest += row.interest;
      g.prepayment += row.prepayment;
      g.paid += row.emi + row.prepayment;
      g.closing = row.closing;
      cumPaid += row.principal + row.prepayment;
      row.paidPct = principal > 0 ? Math.min(100, cumPaid / principal * 100) : 0;
      g.paidPct = row.paidPct;
    });
    return groups;
  }

  /* ------------------------------------------------------------------ *
   * Parsing & validation
   * ------------------------------------------------------------------ */
  function parseLoose(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return { blank: true };
    s = s.replace(/^(₹|rs\.?|inr)\s*/i, '').replace(/[,\s]/g, '').replace(/%$/, '');
    if (/^-/.test(s)) return { negative: true };
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { invalid: true };
    return { value: parseFloat(s) };
  }

  var L = CONFIG.limits;
  var RULES = {
    amount: {
      limits: L.amount,
      blank: 'Please enter a loan amount.',
      invalid: 'Please enter a valid loan amount (numbers only).',
      positive: 'Loan amount must be greater than zero.',
      range: function (l) { return 'Loan amount must be between ' + formatINR(l.min) + ' and ' + formatINR(l.max) + ' (' + formatShortINR(l.max).replace('.00 Cr', ' crore') + ').'; }
    },
    rate: {
      limits: L.rate,
      blank: 'Please enter an interest rate.',
      invalid: 'Please enter a valid interest rate.',
      positive: 'Interest rate must be greater than zero.',
      range: function (l) { return 'Interest rate must be between ' + l.min + '% and ' + l.max + '% per annum.'; }
    },
    years: {
      limits: L.years, integer: 'Please enter a whole number of years (or switch to months).',
      blank: 'Please enter a loan tenure.',
      invalid: 'Please enter a valid loan tenure.',
      positive: 'Loan tenure must be greater than zero.',
      range: function (l) { return 'Tenure must be between ' + l.min + ' and ' + l.max + ' years.'; }
    },
    months: {
      limits: L.months, integer: 'Please enter a whole number of months.',
      blank: 'Please enter a loan tenure.',
      invalid: 'Please enter a valid loan tenure.',
      positive: 'Loan tenure must be greater than zero.',
      range: function (l) { return 'Tenure must be between ' + l.min + ' and ' + l.max + ' months.'; }
    },
    fee: {
      limits: L.feePct, allowZero: true,
      blank: 'Please enter a processing fee (enter 0 if none).',
      invalid: 'Please enter a valid processing fee.',
      positive: 'Processing fee cannot be negative.',
      range: function (l) { return 'Processing fee must be between ' + l.min + '% and ' + l.max + '%.'; }
    },
    prepay: {
      limits: { min: 1, max: L.amount.max },
      blank: 'Please enter a prepayment amount.',
      invalid: 'Please enter a valid prepayment amount (numbers only).',
      positive: 'Prepayment amount must be greater than zero.',
      range: function (l) { return 'Prepayment amount cannot exceed ' + formatINR(l.max) + '.'; }
    },
    month: {
      limits: { min: 1, max: L.months.max }, integer: 'Please enter a whole month number.',
      blank: 'Please enter a month number.',
      invalid: 'Please enter a valid month number.',
      positive: 'Month number must be 1 or more.',
      range: function (l) { return 'Month must be between ' + l.min + ' and ' + l.max + '.'; }
    }
  };

  /** Returns { value } or { error } — never NaN / Infinity. */
  function validate(kind, raw, limits) {
    var rule = RULES[kind], lim = limits || rule.limits, p = parseLoose(raw);
    if (p.blank) return { error: rule.blank };
    if (p.negative) return { error: rule.positive };
    if (p.invalid || !isNum(p.value)) return { error: rule.invalid };
    var v = p.value;
    if (v === 0 && !rule.allowZero) return { error: rule.positive };
    if (rule.integer && Math.floor(v) !== v) return { error: rule.integer };
    if (v < lim.min || v > lim.max) return { error: rule.range(lim) };
    return { value: v };
  }

  /* ------------------------------------------------------------------ *
   * DOM helpers
   * ------------------------------------------------------------------ */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function setText(el, text) { if (typeof el === 'string') el = $(el); if (el) el.textContent = text; }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }

  function showError(input, errorEl, message) {
    if (!input) return;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = message || '';
      var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (ids.indexOf(errorEl.id) < 0) { ids.push(errorEl.id); input.setAttribute('aria-describedby', ids.join(' ')); }
    }
  }

  // Log-scale mapping so the amount slider is usable from ₹10,000 to ₹10 crore.
  var SLIDER_STEPS = 1000;
  function niceRound(v) {
    var step = v < 1e5 ? 1000 : v < 1e6 ? 10000 : v < 1e7 ? 50000 : 100000;
    return Math.round(v / step) * step;
  }
  function amountToPos(v) {
    var lo = Math.log(L.amount.min), hi = Math.log(L.amount.max);
    var x = (Math.log(Math.min(Math.max(v, L.amount.min), L.amount.max)) - lo) / (hi - lo);
    return Math.round(x * SLIDER_STEPS);
  }
  function posToAmount(pos) {
    var lo = Math.log(L.amount.min), hi = Math.log(L.amount.max);
    var v = Math.exp(lo + (pos / SLIDER_STEPS) * (hi - lo));
    return Math.min(L.amount.max, Math.max(L.amount.min, niceRound(v)));
  }

  /**
   * A validated numeric input, optionally paired with a range slider.
   * o: { input, slider?, error?, rule: string | () => string, limits?: () => {min,max},
   *      format?: v => string, toSlider?, fromSlider?, sliderText?, onChange? }
   */
  function Field(o) {
    var self = this;
    this.o = o;
    this.value = NaN;
    this.valid = false;
    o.format = o.format || function (v) { return String(v); };
    o.input.addEventListener('input', function () { self.validate(); self.syncSlider(); self.changed(); });
    o.input.addEventListener('change', function () { if (self.valid) o.input.value = o.format(self.value); });
    if (o.slider) {
      o.slider.addEventListener('input', function () {
        var pos = parseFloat(o.slider.value);
        self.set(o.fromSlider ? o.fromSlider(pos) : pos, true);
      });
    }
    this.validate();
    this.syncSlider();
  }
  Field.prototype.kind = function () { return typeof this.o.rule === 'function' ? this.o.rule() : this.o.rule; };
  Field.prototype.limits = function () { return this.o.limits ? this.o.limits() : RULES[this.kind()].limits; };
  Field.prototype.validate = function () {
    var res = validate(this.kind(), this.o.input.value, this.limits());
    this.valid = !res.error;
    this.value = this.valid ? res.value : NaN;
    showError(this.o.input, this.o.error, res.error);
    return this.valid;
  };
  Field.prototype.syncSlider = function () {
    var s = this.o.slider;
    if (!s || !this.valid) return;
    var pos = this.o.toSlider ? this.o.toSlider(this.value) : this.value;
    s.value = pos;
    s.setAttribute('aria-valuetext', this.o.sliderText ? this.o.sliderText(this.value) : this.o.format(this.value));
  };
  Field.prototype.set = function (v, fromSlider) {
    this.o.input.value = this.o.format(v);
    this.validate();
    if (fromSlider && this.o.slider) {
      this.o.slider.setAttribute('aria-valuetext', this.o.sliderText ? this.o.sliderText(v) : this.o.format(v));
    } else {
      this.syncSlider();
    }
    this.changed();
  };
  Field.prototype.changed = function () { if (this.o.onChange) this.o.onChange(this); };

  /** Toggle-button group using aria-pressed. */
  function ToggleGroup(buttons, o) {
    var self = this;
    this.buttons = buttons;
    this.o = o;
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { self.select(b.getAttribute(o.attr), true); });
    });
  }
  ToggleGroup.prototype.select = function (value, user) {
    var o = this.o;
    this.value = value;
    this.buttons.forEach(function (b) {
      var on = b.getAttribute(o.attr) === String(value);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      (o.on || '').split(' ').filter(Boolean).forEach(function (c) { b.classList.toggle(c, on); });
      (o.off || '').split(' ').filter(Boolean).forEach(function (c) { b.classList.toggle(c, !on); });
    });
    if (o.onSelect) o.onSelect(value, !!user);
  };

  /**
   * Tenure input with a Years / Months unit switch.
   * o: { input, slider, error, yearsBtn, monthsBtn, unitLabel?, minLabel?, midLabel?, maxLabel?, onChange, on, off }
   */
  function TenureField(o) {
    var self = this;
    this.unit = 'years';
    this.o = o;
    this.field = new Field({
      input: o.input, slider: o.slider, error: o.error,
      rule: function () { return self.unit; },
      sliderText: function (v) { return plural(v, self.unit === 'years' ? 'year' : 'month', self.unit); },
      onChange: o.onChange
    });
    this.toggle = new ToggleGroup([o.yearsBtn, o.monthsBtn], {
      attr: 'data-unit', on: o.on, off: o.off,
      onSelect: function (u, user) { if (user) self.setUnit(u, true); }
    });
    this.applyUnitUi();
  }
  TenureField.prototype.applyUnitUi = function () {
    var yrs = this.unit === 'years', lim = yrs ? L.years : L.months, s = this.o.slider;
    this.toggle.select(this.unit, false);
    if (s) { s.min = lim.min; s.max = lim.max; s.step = 1; }
    if (this.o.unitLabel) this.o.unitLabel.textContent = yrs ? 'Years' : 'Months';
    if (this.o.minLabel) this.o.minLabel.textContent = yrs ? '1 year' : '1 month';
    if (this.o.midLabel) this.o.midLabel.textContent = yrs ? '15 years' : '180 months';
    if (this.o.maxLabel) this.o.maxLabel.textContent = yrs ? '30 years' : '360 months';
  };
  TenureField.prototype.setUnit = function (unit, convert) {
    if (unit === this.unit) return;
    var months = this.months();
    this.unit = unit;
    this.applyUnitUi();
    if (convert && isNum(months)) {
      var v = unit === 'years' ? Math.min(L.years.max, Math.max(1, Math.round(months / 12))) : months;
      this.field.set(v);
    } else {
      this.field.validate();
      this.field.syncSlider();
      this.field.changed();
    }
  };
  TenureField.prototype.months = function () {
    if (!this.field.valid) return NaN;
    return this.unit === 'years' ? this.field.value * 12 : this.field.value;
  };
  TenureField.prototype.setMonths = function (m) {
    if (m % 12 === 0 && m / 12 <= L.years.max) { this.unit = 'years'; this.applyUnitUi(); this.field.set(m / 12); }
    else { this.unit = 'months'; this.applyUnitUi(); this.field.set(m); }
  };
  Object.defineProperty(TenureField.prototype, 'valid', { get: function () { return this.field.valid; } });

  /** Donut: two circles in a -90°-rotated SVG. */
  function setDonut(principalCircle, interestCircle, principalFrac) {
    if (!principalCircle || !interestCircle) return;
    var rAttr = parseFloat(principalCircle.getAttribute('r')), C = 2 * Math.PI * rAttr;
    var cx = principalCircle.getAttribute('cx'), cy = principalCircle.getAttribute('cy');
    var pf = isNum(principalFrac) ? Math.min(1, Math.max(0, principalFrac)) : 0;
    [principalCircle, interestCircle].forEach(function (c) { c.setAttribute('stroke-dasharray', C.toFixed(3)); });
    principalCircle.style.strokeDashoffset = (C * (1 - pf)).toFixed(3);
    interestCircle.style.strokeDashoffset = (C * pf).toFixed(3);
    interestCircle.setAttribute('transform', 'rotate(' + (pf * 360).toFixed(2) + ' ' + cx + ' ' + cy + ')');
    interestCircle.style.opacity = isNum(principalFrac) ? '1' : '0';
  }

  /* ------------------------------------------------------------------ *
   * Toast / live status
   * ------------------------------------------------------------------ */
  var toastTimer;
  function toast(message, extraNode) {
    var t = $('#cw-toast');
    if (!t) {
      t = el('div', { id: 'cw-toast', class: 'cw-toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(t);
    }
    t.textContent = message;
    if (extraNode) t.appendChild(extraNode);
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-visible'); }, extraNode ? 12000 : 3500);
  }

  /* ------------------------------------------------------------------ *
   * Share links (URL parameters)
   * ------------------------------------------------------------------ */
  function getParams() {
    try { return new URLSearchParams(window.location.search); } catch (e) { return { get: function () { return null; }, has: function () { return false; } }; }
  }
  /** Validated URL parameter → value, or undefined when missing / invalid. */
  var ignoredParams = [];
  function param(params, key, kind, limits) {
    var raw = params.get(key);
    if (raw == null) return undefined;
    var res = raw.length > 20 ? { error: true } : validate(kind, raw, limits);
    if (res.error) { ignoredParams.push(key); return undefined; }
    return res.value;
  }
  /** Record a non-numeric link value (e.g. an unknown option) that was ignored. */
  function ignoreParam(key) { ignoredParams.push(key); }
  /** After reading a shared link: tell the user if some values could not be used. */
  function reportIgnoredParams() {
    if (!ignoredParams.length) return;
    toast('Some values in this link were missing or invalid, so default values are shown for them.');
    ignoredParams = [];
  }
  function shareUrl(values) {
    var u = new URL(window.location.pathname, window.location.origin);
    Object.keys(values).forEach(function (k) {
      var v = values[k];
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    });
    return u.toString();
  }
  function copyText(text) {
    function fallback() {
      return new Promise(function (resolve, reject) {
        try {
          var ta = el('textarea', { readonly: '', class: 'cw-offscreen' });
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand && document.execCommand('copy');
          document.body.removeChild(ta);
          ok ? resolve() : reject(new Error('copy failed'));
        } catch (e) { reject(e); }
      });
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    return fallback();
  }
  function shareLink(url) {
    copyText(url).then(function () {
      toast('Link copied. Anyone opening it will see the same inputs.');
    }).catch(function () {
      var input = el('input', { type: 'text', readonly: '', class: 'cw-toast__input', 'aria-label': 'Share link' });
      input.value = url;
      toast('Copy this link:', input);
      input.focus();
      input.select();
    });
  }

  /* ------------------------------------------------------------------ *
   * CSV export
   * ------------------------------------------------------------------ */
  function csvCell(v) {
    var s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s) && !/^-?\d/.test(s)) s = "'" + s; // spreadsheet formula guard
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function downloadCSV(filename, rows) {
    var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename, class: 'cw-offscreen' });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  }
  function money2(n) { return isNum(n) ? n.toFixed(2) : ''; }

  /* ------------------------------------------------------------------ *
   * Print / save-as-PDF report (built with DOM APIs, no innerHTML)
   * spec: { title, sections: [{ heading, pairs?: [[k,v]], table?: {head, rows}, notes?: [] }] }
   * ------------------------------------------------------------------ */
  function printReport(spec) {
    var old = $('#cw-print-root');
    if (old) old.parentNode.removeChild(old);
    var now = new Date();
    var rootEl = el('div', { id: 'cw-print-root', class: 'print-report' }, [
      el('div', { class: 'print-report__brand', text: 'CalcWise' }),
      el('h1', { text: spec.title }),
      el('p', { class: 'print-report__meta', text: 'Generated on ' + now.getDate() + ' ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear() + ' · ' + CONFIG.siteUrl.replace('https://', '') })
    ]);
    spec.sections.forEach(function (s) {
      var sec = el('section', null, [el('h2', { text: s.heading })]);
      if (s.pairs) {
        var dl = el('table', { class: 'print-report__pairs' });
        s.pairs.forEach(function (p) {
          dl.appendChild(el('tr', null, [el('th', { scope: 'row', text: p[0] }), el('td', { text: p[1] })]));
        });
        sec.appendChild(dl);
      }
      if (s.table) {
        var tbl = el('table', { class: 'print-report__table' });
        tbl.appendChild(el('thead', null, [el('tr', null, s.table.head.map(function (h) { return el('th', { scope: 'col', text: h }); }))]));
        var tb = el('tbody');
        s.table.rows.forEach(function (r) { tb.appendChild(el('tr', null, r.map(function (c) { return el('td', { text: c }); }))); });
        tbl.appendChild(tb);
        sec.appendChild(tbl);
      }
      (s.notes || []).forEach(function (n) { sec.appendChild(el('p', { text: n })); });
      rootEl.appendChild(sec);
    });
    rootEl.appendChild(el('p', { class: 'print-report__disclaimer', text: TEXT.method + ' ' + TEXT.disclaimer }));
    document.body.appendChild(rootEl);
    document.documentElement.classList.add('cw-printing');
    var cleanup = function () {
      document.documentElement.classList.remove('cw-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    try { window.print(); } catch (e) { cleanup(); toast('Printing is not available in this browser.'); return; }
    // Some mobile browsers return immediately without firing afterprint.
    setTimeout(function () { if (!window.matchMedia || !window.matchMedia('print').matches) cleanup(); }, 1500);
  }

  /* ------------------------------------------------------------------ *
   * Site chrome: mobile navigation and config-driven labels
   * ------------------------------------------------------------------ */
  function initNav() {
    var btn = $('.nav-toggle'), nav = $('#site-nav');
    if (!btn || !nav) return;
    function set(open) {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      var icon = $('.material-symbols-outlined', btn);
      if (icon) icon.textContent = open ? 'close' : 'menu';
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (nav.classList.contains('is-open') && !nav.contains(e.target) && !btn.contains(e.target)) set(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 768) set(false); });
  }

  function fillConfigText() {
    var map = {
      amountMin: formatShortINR(L.amount.min).replace('.00', ''),
      amountMax: formatShortINR(L.amount.max).replace('.00', ''),
      rateRange: L.rate.min + '% – ' + L.rate.max + '%',
      rateMin: L.rate.min + '%',
      rateMax: L.rate.max + '%',
      rateNote: TEXT.rateNote,
      methodNote: TEXT.method,
      disclaimer: TEXT.disclaimer,
      taxNote: TEXT.tax,
      gstPct: String(CONFIG.gstOnFeesPct)
    };
    $$('[data-cw-text]').forEach(function (node) {
      var k = node.getAttribute('data-cw-text');
      if (map[k] != null) node.textContent = map[k];
    });
  }

  function renderRateChips(container, onPick) {
    if (!container) return;
    container.textContent = '';
    CONFIG.illustrativeRates.forEach(function (rate) {
      var b = el('button', { type: 'button', class: 'rate-chip', 'data-rate': String(rate), text: formatRate(rate) + '%' });
      b.addEventListener('click', function () { onPick(rate); });
      container.appendChild(b);
    });
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn();
  }
  if (typeof document !== 'undefined') onReady(function () { initNav(); fillConfigText(); });

  root.CalcWise = {
    CONFIG: CONFIG, TEXT: TEXT, MONTHS: MONTHS,
    isNum: isNum, formatNumber: formatNumber, formatINR: formatINR, formatShortINR: formatShortINR,
    formatPct: formatPct, formatRate: formatRate, formatTenure: formatTenure, plural: plural,
    firstOfNextMonth: firstOfNextMonth, addMonths: addMonths, monthLabel: monthLabel,
    toMonthValue: toMonthValue, parseMonthValue: parseMonthValue, yearLabel: yearLabel,
    emi: emi, amortize: amortize, balanceAfter: balanceAfter, crossoverMonth: crossoverMonth,
    effectiveAnnualRate: effectiveAnnualRate, groupByYear: groupByYear,
    parseLoose: parseLoose, validate: validate, RULES: RULES,
    $: $, $$: $$, el: el, setText: setText, showError: showError,
    amountToPos: amountToPos, posToAmount: posToAmount, SLIDER_STEPS: SLIDER_STEPS,
    Field: Field, ToggleGroup: ToggleGroup, TenureField: TenureField, setDonut: setDonut,
    toast: toast, getParams: getParams, param: param, ignoreParam: ignoreParam, reportIgnoredParams: reportIgnoredParams,
    shareUrl: shareUrl, shareLink: shareLink,
    copyText: copyText, downloadCSV: downloadCSV, money2: money2, printReport: printReport,
    renderRateChips: renderRateChips, onReady: onReady
  };
})(typeof window !== 'undefined' ? window : globalThis);
