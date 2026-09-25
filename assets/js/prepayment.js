/* CalcWise — loan prepayment calculator page */
(function () {
  'use strict';
  var CW = window.CalcWise;
  if (!CW) return;
  var $ = CW.$, $$ = CW.$$, C = CW.CONFIG, L = C.limits, fmt = CW.formatINR;
  var TOG_ON = 'bg-surface-container-lowest text-primary shadow-sm font-bold';
  var TOG_OFF = 'text-on-surface-variant hover:text-on-surface font-semibold';
  var STRATEGIES = {
    onetime: { label: 'One-time prepayment amount', timing: 'Prepay in EMI month', amount: 500000, month: 12, presets: [100000, 200000, 500000, 1000000] },
    monthly: { label: 'Extra amount every month', timing: 'Starting from EMI month', amount: 5000, month: 1, presets: [2000, 5000, 10000, 25000] },
    yearly: { label: 'Extra amount every year', timing: 'First yearly prepayment in EMI month', amount: 100000, month: 12, presets: [25000, 50000, 100000, 200000] }
  };
  var DEFAULTS = { amount: C.defaults.amount, rate: C.defaults.rate, years: C.defaults.years };

  CW.onReady(function () {
    var strategy = 'onetime', mode = 'tenure', scheduled = false;
    function queueRender() {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function () { scheduled = false; render(); }, 0);
    }

    var principal = new CW.Field({
      input: $('#inputPrincipal'), slider: $('#sliderPrincipal'), error: $('#principalError'), rule: 'amount',
      format: CW.formatNumber, toSlider: CW.amountToPos, fromSlider: CW.posToAmount, sliderText: fmt, onChange: queueRender
    });
    var rate = new CW.Field({
      input: $('#inputRate'), slider: $('#sliderRate'), error: $('#rateError'), rule: 'rate',
      format: CW.formatRate, sliderText: function (v) { return CW.formatRate(v) + ' percent'; }, onChange: queueRender
    });
    var tenure = new CW.TenureField({
      input: $('#inputTenure'), slider: $('#sliderTenure'), error: $('#tenureError'),
      yearsBtn: $('#unitYears'), monthsBtn: $('#unitMonths'), minLabel: $('#tenureMinLabel'), maxLabel: $('#tenureMaxLabel'),
      on: TOG_ON, off: TOG_OFF, onChange: queueRender
    });
    var prepay = new CW.Field({
      input: $('#inputPrepayAmount'), error: $('#prepayAmountError'), rule: 'prepay', format: CW.formatNumber,
      limits: function () { return { min: 1, max: principal.valid ? principal.value : L.amount.max }; },
      onChange: queueRender
    });
    var timing = new CW.Field({
      input: $('#inputPrepayTiming'), error: $('#timingError'), rule: 'month',
      limits: function () { return { min: 1, max: tenure.valid ? tenure.months() : L.months.max }; },
      onChange: queueRender
    });

    var strategyGroup = new CW.ToggleGroup($$('.strategy-tab'), {
      attr: 'data-strat', on: TOG_ON, off: TOG_OFF,
      onSelect: function (s, user) {
        strategy = s;
        var cfg = STRATEGIES[s];
        CW.setText('#labelPrepayAmount', cfg.label);
        CW.setText('#labelTiming', cfg.timing);
        renderPresets(cfg.presets);
        if (user) { prepay.set(cfg.amount); timing.set(cfg.month); }
      }
    });
    var modeGroup = new CW.ToggleGroup($$('.mode-btn'), {
      attr: 'data-mode', on: TOG_ON, off: TOG_OFF,
      onSelect: function (m, user) { mode = m; if (user) queueRender(); }
    });

    function renderPresets(list) {
      var row = $('#presetRow');
      row.textContent = '';
      list.forEach(function (v) {
        var b = CW.el('button', { type: 'button', class: 'px-2.5 py-1.5 rounded bg-surface-container text-on-surface-variant hover:text-primary font-label-sm text-label-sm', text: CW.formatShortINR(v).replace('.00', '') });
        b.addEventListener('click', function () { prepay.set(v); });
        row.appendChild(b);
      });
    }

    function compute() {
      if (!(principal.valid && rate.valid && tenure.valid)) return null;
      var okA = prepay.validate(), okT = timing.validate();
      if (!okA || !okT) return null;
      var n = tenure.months();
      var base = CW.amortize({ principal: principal.value, annualRate: rate.value, months: n });
      var plan = CW.amortize({ principal: principal.value, annualRate: rate.value, months: n,
        prepay: { type: strategy, amount: prepay.value, startMonth: timing.value, mode: mode } });
      return { n: n, base: base, plan: plan, saved: base.totalInterest - plan.totalInterest, cut: base.months - plan.months };
    }

    function render() {
      if (principal.valid && rate.valid && tenure.valid) {
        var n0 = tenure.months();
        CW.setText('#outputEmi', fmt(CW.emi(principal.value, rate.value, n0)));
        CW.setText('#tenureInMonths', CW.plural(n0, 'month', 'months') + ' remaining');
      } else {
        CW.setText('#outputEmi', '—');
        CW.setText('#tenureInMonths', '—');
      }
      var r = compute();
      if (!r) return renderEmpty();
      var base = r.base, plan = r.plan;

      if (mode === 'tenure') {
        CW.setText('#statHeadline', r.cut > 0 ? 'Loan closes ' + CW.formatTenure(r.cut) + ' earlier' : 'Tenure unchanged');
        CW.setText('#statSubline', r.cut > 0
          ? CW.plural(r.cut, 'fewer EMI', 'fewer EMIs') + ' — last EMI in ' + CW.monthLabel(plan.endDate) + ' instead of ' + CW.monthLabel(base.endDate) + '.'
          : 'The prepayment is too small or too late to shorten the loan by a full month.');
      } else {
        CW.setText('#statHeadline', 'EMI falls to ' + fmt(plan.lastEmi));
        CW.setText('#statSubline', 'From ' + fmt(base.emi) + ' today. Tenure stays ' + CW.formatTenure(plan.months) + '; the EMI shown applies after the last prepayment.');
      }
      CW.setText('#statInterestSavedHero', fmt(r.saved));
      CW.setText('#statNewTenure', CW.formatTenure(plan.months));
      CW.setText('#statPrepaymentSum', fmt(plan.totalPrepaid));

      CW.setText('#statOldTenure', CW.formatTenure(base.months) + ' (' + base.months + ' EMIs)');
      CW.setText('#statOldEmi', fmt(base.emi));
      CW.setText('#statOldInterest', fmt(base.totalInterest));
      CW.setText('#statOldOutflow', fmt(base.totalPaid));
      CW.setText('#statOldPayoff', CW.monthLabel(base.endDate));
      CW.setText('#statOptimizedTenure', CW.formatTenure(plan.months) + ' (' + plan.months + ' EMIs)');
      CW.setText('#newEmiLabel', mode === 'tenure' ? 'EMI (unchanged)' : 'EMI after last prepayment');
      CW.setText('#statNewEmi', fmt(mode === 'tenure' ? base.emi : plan.lastEmi));
      CW.setText('#statOptimizedInterest', fmt(plan.totalInterest));
      CW.setText('#statOptimizedOutflow', fmt(plan.totalPaid));
      CW.setText('#statOptimizedPayoff', CW.monthLabel(plan.endDate));

      var pct = base.totalInterest > 0 ? Math.min(100, Math.max(0, r.saved / base.totalInterest * 100)) : 0;
      CW.setText('#badgeInterestSlashPct', pct.toFixed(1) + '% less interest');
      $('#barOptimized').style.width = (100 - pct) + '%';
      $('#barSaved').style.width = pct + '%';
      CW.setText('#ratioRemaining', CW.formatPct(100 - pct));
      CW.setText('#ratioShaved', CW.formatPct(pct));

      CW.setText('#metricSaved', fmt(r.saved));
      CW.setText('#metricTenureCut', CW.plural(r.cut, 'month', 'months'));
      CW.setText('#metricTenureCutNote', mode === 'tenure' ? (r.cut >= 12 ? CW.formatTenure(r.cut) + ' fewer EMIs' : 'Fewer EMIs to pay') : 'Tenure is unchanged in "reduce EMI" mode');
      CW.setText('#metricEmiLabel', mode === 'tenure' ? 'Monthly EMI' : 'EMI after last prepayment');
      CW.setText('#metricEmi', fmt(mode === 'tenure' ? base.emi : plan.lastEmi));
      CW.setText('#metricEmiNote', mode === 'tenure' ? 'Unchanged — the loan finishes sooner' : 'Down from ' + fmt(base.emi));

      var firstPrepay = null;
      for (var i = 0; i < plan.rows.length; i++) if (plan.rows[i].prepayment > 0) { firstPrepay = plan.rows[i]; break; }
      CW.setText('#timingHint', timing.value <= r.n
        ? 'EMI ' + timing.value + ' falls in ' + CW.monthLabel(CW.addMonths(base.startDate, timing.value - 1)) + ' (month 1 = your next EMI).'
        : 'Month 1 = your next EMI.');
      renderChart(base, plan, firstPrepay);
    }

    function renderEmpty() {
      ['#statInterestSavedHero', '#statNewTenure', '#statPrepaymentSum', '#statOldTenure', '#statOldEmi', '#statOldInterest',
        '#statOldOutflow', '#statOldPayoff', '#statOptimizedTenure', '#statNewEmi', '#statOptimizedInterest', '#statOptimizedOutflow',
        '#statOptimizedPayoff', '#badgeInterestSlashPct', '#ratioRemaining', '#ratioShaved', '#metricSaved', '#metricTenureCut',
        '#metricEmi', '#chartLabelOptimizedEnd', '#chartLabelOldEnd', '#chartLabelPrepay'].forEach(function (id) { CW.setText(id, '—'); });
      CW.setText('#statHeadline', 'Check your inputs');
      CW.setText('#statSubline', 'Correct the highlighted fields to see the effect of prepayment.');
      $('#barOptimized').style.width = '0%';
      $('#barSaved').style.width = '0%';
      ['#lineBase', '#linePlan'].forEach(function (id) { $(id).setAttribute('points', ''); });
      $('#areaPlan').setAttribute('d', '');
    }

    function renderChart(base, plan, firstPrepay) {
      var P = base.principal, N = base.months;
      function pt(m, bal) { return (m / N * 900).toFixed(1) + ',' + (250 - bal / P * 240).toFixed(1); }
      function points(s) { return [pt(0, P)].concat(s.rows.map(function (r) { return pt(r.month, r.closing); })); }
      var basePts = points(base), planPts = points(plan);
      $('#lineBase').setAttribute('points', basePts.join(' '));
      $('#linePlan').setAttribute('points', planPts.join(' '));
      $('#areaPlan').setAttribute('d', 'M ' + planPts.join(' L ') + ' L ' + (plan.months / N * 900).toFixed(1) + ',250 L 0,250 Z');
      CW.setText('#chartDesc', 'Outstanding balance: without prepayment the loan ends after ' + base.months + ' EMIs; with prepayment after ' + plan.months + ' EMIs.');
      CW.setText('#chartLabelPrepay', firstPrepay ? 'First prepayment: EMI ' + firstPrepay.month + ' (' + CW.monthLabel(firstPrepay.date) + ')' : 'No prepayment applied');
      CW.setText('#chartLabelOptimizedEnd', 'With prepayment: EMI ' + plan.months + ' (' + CW.monthLabel(plan.endDate) + ')');
      CW.setText('#chartLabelOldEnd', 'Without: EMI ' + base.months + ' (' + CW.monthLabel(base.endDate) + ')');
    }

    /* ------------------------------ actions ------------------------------ */
    function strategyText() {
      return strategy === 'onetime' ? 'One-time ' + fmt(prepay.value) + ' in EMI month ' + timing.value
        : (strategy === 'monthly' ? fmt(prepay.value) + ' extra every month' : fmt(prepay.value) + ' extra every year') + ' from EMI month ' + timing.value;
    }

    $('#exportBtn').addEventListener('click', function () {
      var r = compute();
      if (!r) { CW.toast('Please correct the highlighted inputs first.'); return; }
      var base = r.base, plan = r.plan;
      var groups = CW.groupByYear(plan.rows, 'cal', plan.principal);
      CW.printReport({
        title: 'Loan Prepayment Report',
        sections: [
          { heading: 'Loan details', pairs: [
            ['Outstanding principal', fmt(principal.value)],
            ['Interest rate', CW.formatRate(rate.value) + '% p.a.'],
            ['Remaining tenure', CW.formatTenure(r.n) + ' (' + r.n + ' EMIs)'],
            ['Current EMI', fmt(base.emi)],
            ['Prepayment plan', strategyText()],
            ['After prepayment', mode === 'tenure' ? 'Keep EMI, reduce tenure' : 'Keep tenure, reduce EMI']
          ] },
          { heading: 'Comparison', table: {
            head: ['', 'Without prepayment', 'With prepayment'],
            rows: [
              ['Number of EMIs', String(base.months), String(plan.months)],
              ['Last EMI', CW.monthLabel(base.endDate), CW.monthLabel(plan.endDate)],
              ['EMI', fmt(base.emi), fmt(mode === 'tenure' ? base.emi : plan.lastEmi) + (mode === 'emi' ? ' (after last prepayment)' : '')],
              ['Total interest', fmt(base.totalInterest), fmt(plan.totalInterest)],
              ['Total prepaid', fmt(0), fmt(plan.totalPrepaid)],
              ['Total payments', fmt(base.totalPaid), fmt(plan.totalPaid)]
            ]
          }, notes: ['Interest saved: ' + fmt(r.saved) + '. Interest saved is the reduction in interest payable on this loan; it is not an investment return. Prepayment charges, if any, are not included.'] },
          { heading: 'Year-wise schedule with prepayment (calendar year)', table: {
            head: ['Year', 'Principal', 'Interest', 'Prepayment', 'Total paid', 'Balance'],
            rows: groups.map(function (g) { return [g.label, fmt(g.principal), fmt(g.interest), fmt(g.prepayment), fmt(g.paid), fmt(g.closing)]; })
          } }
        ]
      });
    });

    $('#csvBtn').addEventListener('click', function () {
      var r = compute();
      if (!r) { CW.toast('Please correct the highlighted inputs first.'); return; }
      var rows = [['EMI no.', 'Month', 'Opening balance', 'EMI', 'Principal', 'Interest', 'Prepayment', 'Closing balance']];
      r.plan.rows.forEach(function (x) {
        rows.push([x.month, CW.monthLabel(x.date), CW.money2(x.opening), CW.money2(x.emi), CW.money2(x.principal), CW.money2(x.interest), CW.money2(x.prepayment), CW.money2(x.closing)]);
      });
      rows.push([], ['Plan', strategyText()], ['Interest without prepayment', CW.money2(r.base.totalInterest)],
        ['Interest with prepayment', CW.money2(r.plan.totalInterest)], ['Interest saved', CW.money2(r.saved)]);
      CW.downloadCSV('calcwise-prepayment-schedule.csv', rows);
    });

    $('#shareBtn').addEventListener('click', function () {
      if (!compute()) { CW.toast('Please correct the highlighted inputs first.'); return; }
      CW.shareLink(CW.shareUrl({ amount: principal.value, rate: rate.value, tenure: tenure.field.value, unit: tenure.unit,
        ptype: strategy, pamt: prepay.value, pmonth: timing.value, pmode: mode }));
    });

    function reset() {
      principal.set(DEFAULTS.amount);
      rate.set(DEFAULTS.rate);
      tenure.setMonths(DEFAULTS.years * 12);
      strategyGroup.select('onetime', true);
      modeGroup.select('tenure', false);
      if (window.history && history.replaceState) history.replaceState(null, '', location.pathname);
      queueRender();
    }
    $('#resetDefaultsBtn').addEventListener('click', function () { reset(); CW.toast('Reset to default values.'); });

    // Initial state + URL parameters
    strategyGroup.select('onetime', false);
    modeGroup.select('tenure', false);
    (function loadParams() {
      var p = CW.getParams(), v;
      if ((v = CW.param(p, 'amount', 'amount')) !== undefined) principal.set(v);
      if ((v = CW.param(p, 'rate', 'rate')) !== undefined) rate.set(v);
      var unit = p.get('unit') === 'months' ? 'months' : 'years';
      if ((v = CW.param(p, 'tenure', unit)) !== undefined) {
        if (unit === 'years') tenure.setMonths(v * 12);
        else { tenure.setUnit('months', false); tenure.field.set(v); }
      }
      var s = p.get('ptype');
      if (Object.prototype.hasOwnProperty.call(STRATEGIES, s)) strategyGroup.select(s, true);
      if ((v = CW.param(p, 'pamt', 'prepay')) !== undefined) prepay.set(v);
      if ((v = CW.param(p, 'pmonth', 'month')) !== undefined) timing.set(v);
      if (p.get('pmode') === 'emi') modeGroup.select('emi', false);
    })();
    render();
  });
})();
