/* CalcWise — home page EMI calculator */
(function () {
  'use strict';
  var CW = window.CalcWise;
  if (!CW) return;
  var $ = CW.$, $$ = CW.$$, C = CW.CONFIG;
  var ON = 'bg-surface-container-lowest text-primary shadow-sm font-bold';
  var OFF = 'text-on-surface-variant hover:text-primary font-medium';

  CW.onReady(function () {
    var amount = new CW.Field({
      input: $('#amountInput'), slider: $('#amountSlider'), error: $('#amountError'), rule: 'amount',
      format: CW.formatNumber, toSlider: CW.amountToPos, fromSlider: CW.posToAmount, sliderText: CW.formatINR,
      onChange: render
    });
    var rate = new CW.Field({
      input: $('#rateInput'), slider: $('#rateSlider'), error: $('#rateError'), rule: 'rate',
      format: CW.formatRate, sliderText: function (v) { return CW.formatRate(v) + ' percent'; }, onChange: render
    });
    var tenure = new CW.TenureField({
      input: $('#tenureInput'), slider: $('#tenureSlider'), error: $('#tenureError'),
      yearsBtn: $('#unitYears'), monthsBtn: $('#unitMonths'), unitLabel: $('#tenureUnitLabel'),
      minLabel: $('#tenureMinLabel'), maxLabel: $('#tenureMaxLabel'),
      on: 'bg-surface-container-lowest text-primary shadow-sm font-bold', off: 'text-on-surface-variant font-medium',
      onChange: render
    });

    var loanTypes = new CW.ToggleGroup($$('.loan-type-btn'), {
      attr: 'data-loan-type', on: ON, off: OFF,
      onSelect: function (type, user) {
        if (!user) return;
        var t = C.loanTypes[type];
        amount.set(t.amount);
        rate.set(t.rate);
        tenure.setMonths(t.years * 12);
      }
    });
    loanTypes.select('home', false);

    $$('[data-amount]').forEach(function (b) {
      b.addEventListener('click', function () { amount.set(+b.getAttribute('data-amount')); });
    });
    $$('[data-years]').forEach(function (b) {
      b.addEventListener('click', function () { tenure.setMonths(+b.getAttribute('data-years') * 12); });
    });
    CW.renderRateChips($('#rateChips'), function (r) { rate.set(r); });

    // Calculator filter
    var cards = $$('.calc-card');
    CW.setText('#countAll', String(cards.length));
    new CW.ToggleGroup($$('.cat-pill'), {
      attr: 'data-filter', on: 'bg-surface-container-lowest text-primary shadow-sm font-semibold', off: 'text-on-surface-variant hover:text-primary font-medium',
      onSelect: function (cat) {
        cards.forEach(function (c) { c.hidden = !(cat === 'all' || c.getAttribute('data-category') === cat); });
      }
    }).select('all', false);

    $('#pdfBtn').addEventListener('click', function () {
      var s = compute();
      if (!s) { CW.toast('Please correct the highlighted inputs first.'); return; }
      var groups = CW.groupByYear(s.rows, 'cal', s.principal);
      CW.printReport({
        title: 'EMI Calculation Summary',
        sections: [
          { heading: 'Loan details', pairs: [
            ['Loan amount', CW.formatINR(s.principal)],
            ['Interest rate', CW.formatRate(rate.value) + '% p.a.'],
            ['Tenure', CW.formatTenure(s.months) + ' (' + s.months + ' months)'],
            ['First EMI (assumed)', CW.monthLabel(s.startDate)]
          ] },
          { heading: 'Results', pairs: [
            ['Monthly EMI', CW.formatINR(s.emi)],
            ['Total interest', CW.formatINR(s.totalInterest)],
            ['Total amount payable', CW.formatINR(s.totalPaid)]
          ] },
          { heading: 'Year-wise amortization (calendar year)', table: {
            head: ['Year', 'Principal', 'Interest', 'Total paid', 'Closing balance', 'Loan paid'],
            rows: groups.map(function (g) {
              return [g.label, CW.formatINR(g.principal), CW.formatINR(g.interest), CW.formatINR(g.paid), CW.formatINR(g.closing), CW.formatPct(g.paidPct)];
            })
          } }
        ]
      });
    });

    function compute() {
      if (!(amount.valid && rate.valid && tenure.valid)) return null;
      return CW.amortize({ principal: amount.value, annualRate: rate.value, months: tenure.months() });
    }

    function linkParams() {
      return { amount: amount.value, rate: rate.value, tenure: tenure.field.value, unit: tenure.unit };
    }

    function render() {
      var s = compute();
      var donutP = $('#donutPrincipal'), donutI = $('#donutInterest');
      if (!s) {
        ['#emiDisplay', '#summaryPrincipal', '#summaryInterest', '#summaryTotal', '#donutRatioDisplay'].forEach(function (id) { CW.setText(id, '—'); });
        CW.setText('#paymentsNote', 'Enter valid loan details');
        CW.setText('#smartInsightText', 'Enter valid loan details to see a prepayment estimate.');
        CW.setDonut(donutP, donutI, NaN);
        $('#scheduleLink').href = '/emi-calculator.html';
        $('#compareLink').href = '/loan-comparison.html';
        return;
      }
      CW.setText('#emiDisplay', CW.formatINR(s.emi));
      CW.setText('#paymentsNote', s.months + ' monthly payments (' + CW.formatTenure(s.months) + ')');
      CW.setText('#summaryPrincipal', CW.formatINR(s.principal));
      CW.setText('#summaryInterest', CW.formatINR(s.totalInterest));
      CW.setText('#summaryTotal', CW.formatINR(s.totalPaid));
      var pf = s.principal / s.totalPaid;
      CW.setText('#donutRatioDisplay', Math.round(pf * 100) + '%');
      CW.setDonut(donutP, donutI, pf);

      // Real prepayment estimate: extra ≈ 10% of EMI every month, reduce-tenure mode.
      var extra = Math.max(500, Math.round(s.emi * 0.1 / 500) * 500);
      var p = CW.amortize({ principal: s.principal, annualRate: rate.value, months: s.months,
        prepay: { type: 'monthly', amount: extra, startMonth: 1, mode: 'tenure' } });
      var insight = $('#smartInsightText');
      insight.textContent = '';
      var saved = s.totalInterest - p.totalInterest, cut = s.months - p.months;
      if (cut > 0 && saved > 0) {
        insight.appendChild(CW.el('strong', { text: 'Prepayment estimate: ' }));
        insight.appendChild(document.createTextNode('paying '));
        insight.appendChild(CW.el('strong', { class: 'text-tertiary-fixed', text: CW.formatINR(extra) + '/month' }));
        insight.appendChild(document.createTextNode(' extra from the first EMI could close this loan about '));
        insight.appendChild(CW.el('strong', { text: CW.formatTenure(cut) }));
        insight.appendChild(document.createTextNode(' earlier and reduce total interest by about '));
        insight.appendChild(CW.el('strong', { text: CW.formatINR(saved) }));
        insight.appendChild(document.createTextNode('. Check prepayment charges with your lender.'));
      } else {
        insight.textContent = 'This loan is short enough that small monthly prepayments make little difference. Try the Prepayment Calculator for other options.';
      }

      var q = linkParams();
      $('#scheduleLink').href = buildUrl('/emi-calculator.html', q);
      $('#compareLink').href = buildUrl('/loan-comparison.html', {
        a_amt: q.amount, a_rate: q.rate, a_yrs: tenure.unit === 'years' ? q.tenure : undefined
      });
    }

    function buildUrl(path, params) {
      var u = new URL(path, location.origin);
      Object.keys(params).forEach(function (k) { if (params[k] !== undefined) u.searchParams.set(k, String(params[k])); });
      return u.pathname + u.search;
    }

    render();
  });
})();
