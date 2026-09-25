/* CalcWise — EMI calculator page */
(function () {
  'use strict';
  var CW = window.CalcWise;
  if (!CW) return;
  var $ = CW.$, $$ = CW.$$, C = CW.CONFIG, L = C.limits, fmt = CW.formatINR;
  var TOG_ON = 'bg-surface-container-lowest text-primary shadow-sm font-bold';
  var TOG_OFF = 'text-on-surface-variant font-medium';
  var PREPAY_TYPES = ['none', 'onetime', 'monthly', 'yearly'];

  CW.onReady(function () {
    var scheduled = false;
    function queueRender() {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function () { scheduled = false; render(); }, 0);
    }

    var amount = new CW.Field({
      input: $('#loanAmountInput'), slider: $('#loanAmountSlider'), error: $('#loanAmountError'), rule: 'amount',
      format: CW.formatNumber, toSlider: CW.amountToPos, fromSlider: CW.posToAmount, sliderText: fmt, onChange: queueRender
    });
    var rate = new CW.Field({
      input: $('#interestRateInput'), slider: $('#interestRateSlider'), error: $('#interestRateError'), rule: 'rate',
      format: CW.formatRate, sliderText: function (v) { return CW.formatRate(v) + ' percent'; }, onChange: queueRender
    });
    var tenure = new CW.TenureField({
      input: $('#tenureValueInput'), slider: $('#tenureSlider'), error: $('#tenureError'),
      yearsBtn: $('#tenureUnitYears'), monthsBtn: $('#tenureUnitMonths'),
      minLabel: $('#sliderMinLabel'), midLabel: $('#sliderMidLabel'), maxLabel: $('#sliderMaxLabel'),
      on: TOG_ON, off: TOG_OFF, onChange: queueRender
    });
    var fee = new CW.Field({ input: $('#feeInput'), error: $('#feeError'), rule: 'fee', onChange: queueRender });
    var gstCheck = $('#gstCheck');
    var startInput = $('#startMonthInput');
    var prepayType = $('#prepayType'), prepayMode = $('#prepayMode');
    var prepayAmount = new CW.Field({
      input: $('#prepayAmount'), error: $('#prepayAmountError'), rule: 'prepay', format: CW.formatNumber,
      limits: function () { return { min: 1, max: amount.valid ? amount.value : L.amount.max }; },
      onChange: queueRender
    });
    var prepayMonth = new CW.Field({
      input: $('#prepayMonth'), error: $('#prepayMonthError'), rule: 'month',
      limits: function () { return { min: 1, max: tenure.valid ? tenure.months() : L.months.max }; },
      onChange: queueRender
    });

    startInput.value = CW.toMonthValue(CW.firstOfNextMonth());
    startInput.addEventListener('input', queueRender);
    startInput.addEventListener('change', queueRender);
    gstCheck.addEventListener('change', queueRender);
    prepayType.addEventListener('change', function () { syncPrepayUi(); queueRender(); });
    prepayMode.addEventListener('change', queueRender);

    $$('[data-amount]').forEach(function (b) { b.addEventListener('click', function () { amount.set(+b.getAttribute('data-amount')); }); });
    CW.renderRateChips($('#rateChips'), function (r) { rate.set(r); });

    // Advanced drawer
    var advToggle = $('#advancedToggle'), drawer = $('#advancedDrawer');
    function setDrawer(open) {
      drawer.hidden = !open;
      advToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      $('#drawerIcon').classList.toggle('rotate-180', open);
    }
    advToggle.addEventListener('click', function () { setDrawer(drawer.hidden); });

    // FAQ accordion
    $$('.faq-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.hidden = !open;
        $('.material-symbols-outlined', btn).classList.toggle('rotate-180', open);
      });
    });

    // Schedule grouping
    var basis = 'cal', expanded = {}, allExpanded = false;
    var basisGroup = new CW.ToggleGroup($$('.basis-btn'), {
      attr: 'data-basis', on: TOG_ON, off: TOG_OFF,
      onSelect: function (b, user) { basis = b; expanded = {}; allExpanded = false; if (user) queueRender(); }
    });
    basisGroup.select('cal', false);
    $('#expandAllBtn').addEventListener('click', function () {
      allExpanded = !allExpanded;
      expanded = {};
      $$('#amortBody .amort-year button').forEach(function (b) { setYear(b, allExpanded); });
      $('#expandAllBtn').textContent = allExpanded ? 'Collapse all' : 'Expand all';
    });

    function syncPrepayUi() {
      var t = prepayType.value, active = t !== 'none';
      $$('.prepay-only').forEach(function (n) { n.hidden = !active; });
      $('#prepayMonthLabel').textContent = t === 'onetime' ? 'In EMI month number' : 'Starting from EMI month';
      if (!active) { CW.showError(prepayAmount.o.input, prepayAmount.o.error, ''); CW.showError(prepayMonth.o.input, prepayMonth.o.error, ''); }
    }

    function startDate() {
      var d = CW.parseMonthValue(startInput.value);
      CW.showError(startInput, $('#startMonthError'), d ? '' : 'Please choose a valid month.');
      return d || CW.firstOfNextMonth();
    }

    /* ------------------------------ compute ------------------------------ */
    function compute() {
      if (!(amount.valid && rate.valid && tenure.valid)) return null;
      var n = tenure.months(), start = startDate();
      var base = CW.amortize({ principal: amount.value, annualRate: rate.value, months: n, startDate: start });
      var st = { n: n, base: base, plan: base, prepay: null, prepayInvalid: false };
      if (prepayType.value !== 'none') {
        var okA = prepayAmount.validate(), okM = prepayMonth.validate();
        if (okA && okM) {
          st.prepay = { type: prepayType.value, amount: prepayAmount.value, startMonth: prepayMonth.value, mode: prepayMode.value };
          st.plan = CW.amortize({ principal: amount.value, annualRate: rate.value, months: n, startDate: start, prepay: st.prepay });
        } else {
          st.prepayInvalid = true;
        }
      }
      st.fee = fee.valid ? amount.value * fee.value / 100 : NaN;
      st.gst = fee.valid && gstCheck.checked ? st.fee * C.gstOnFeesPct / 100 : 0;
      return st;
    }

    /* ------------------------------ render ------------------------------- */
    function render() {
      var st = compute();
      if (!st) return renderEmpty();
      var base = st.base, plan = st.plan;

      CW.setText('#emiDisplay', fmt(base.emi));
      var cross = CW.crossoverMonth(base.rows);
      CW.setText('#emiInsight', cross === 1
        ? 'From the first EMI, more of each EMI goes to principal than to interest.'
        : cross ? 'From EMI ' + cross + ' (' + CW.monthLabel(base.rows[cross - 1].date) + ') onwards, more of each EMI goes to principal than to interest.'
          : 'Most of each EMI goes towards interest for this loan.');
      if (st.prepay && cross > 1) $('#emiInsight').textContent += ' (Regular schedule, before prepayments.)';

      var interestPct = plan.totalInterest / plan.totalPaid * 100;
      CW.setDonut($('#svgPrincipalSegment'), $('#svgInterestSegment'), 1 - interestPct / 100);
      CW.setText('#donutRatioText', Math.round(interestPct) + '%');
      CW.setText('#principalValueDisplay', fmt(plan.principal));
      CW.setText('#principalPercentDisplay', CW.formatPct(100 - interestPct));
      CW.setText('#interestValueDisplay', fmt(plan.totalInterest));
      CW.setText('#interestPercentDisplay', CW.formatPct(interestPct));
      CW.setText('#totalPayableDisplay', fmt(plan.totalPaid));
      $('#totalIncludesPrepay').hidden = !(plan.totalPrepaid > 0);

      // Fees
      var feePanel = $('#feePanel');
      if (CW.isNum(st.fee) && st.fee > 0) {
        feePanel.hidden = false;
        CW.setText('#feeAmount', fmt(st.fee));
        CW.setText('#gstAmount', gstCheck.checked ? fmt(st.gst) : 'Not included');
        CW.setText('#totalCostDisplay', fmt(plan.totalPaid + st.fee + st.gst));
        var apr = CW.effectiveAnnualRate(amount.value - st.fee - st.gst, base.emi, st.n);
        CW.setText('#aprDisplay', CW.isNum(apr) ? apr.toFixed(2) + '%' : '—');
      } else {
        feePanel.hidden = true;
      }

      // Prepayment summary
      var panel = $('#prepayPanel'), summary = $('#prepaySummary');
      if (prepayType.value === 'none') {
        panel.hidden = true;
      } else {
        panel.hidden = false;
        if (st.prepayInvalid) {
          summary.textContent = 'Correct the prepayment inputs to see the effect.';
        } else {
          var saved = base.totalInterest - plan.totalInterest;
          var lines = [];
          if (st.prepay.mode === 'tenure') {
            var cut = base.months - plan.months;
            lines.push('Loan closes after ' + plan.months + ' EMIs (' + CW.monthLabel(plan.endDate) + ') instead of ' + base.months +
              (cut > 0 ? ' — ' + CW.formatTenure(cut) + ' earlier.' : '.'));
          } else {
            lines.push('EMI falls from ' + fmt(base.emi) + ' to ' + fmt(plan.lastEmi) + ' after the last prepayment; tenure stays ' + CW.formatTenure(base.months) + '.');
          }
          lines.push('Total interest ' + fmt(plan.totalInterest) + ' instead of ' + fmt(base.totalInterest) + ' — interest saved: ' + fmt(saved) + '.');
          lines.push('Total prepaid: ' + fmt(plan.totalPrepaid) + '.');
          summary.textContent = lines.join(' ');
        }
      }

      renderSchedule(plan);
      renderTenureTable(st);
      var hint = $('#prepayMonthHint');
      if (prepayMonth.valid && st.n >= prepayMonth.value) {
        hint.textContent = 'EMI ' + prepayMonth.value + ' falls in ' + CW.monthLabel(CW.addMonths(base.startDate, prepayMonth.value - 1)) + '.';
      } else {
        hint.textContent = 'Month 12 = your 12th EMI.';
      }
    }

    function renderEmpty() {
      ['#emiDisplay', '#donutRatioText', '#principalValueDisplay', '#principalPercentDisplay', '#interestValueDisplay',
        '#interestPercentDisplay', '#totalPayableDisplay'].forEach(function (id) { CW.setText(id, '—'); });
      CW.setText('#emiInsight', 'Enter valid loan details to see your EMI.');
      CW.setDonut($('#svgPrincipalSegment'), $('#svgInterestSegment'), NaN);
      $('#feePanel').hidden = true;
      $('#prepayPanel').hidden = true;
      $('#totalIncludesPrepay').hidden = true;
      CW.setText('#amortSummary', '');
      $('#amortHead').textContent = '';
      var body = $('#amortBody');
      body.textContent = '';
      body.appendChild(CW.el('tr', null, [CW.el('td', { class: 'text-left', text: 'Enter valid loan details to see the schedule.' })]));
      var tb = $('#tenureBody');
      tb.textContent = '';
      tb.appendChild(CW.el('tr', null, [CW.el('td', { class: 'py-4 px-6', colspan: '5', text: 'Enter valid loan details to compare tenures.' })]));
      CW.setText('#tenureInsight', 'Longer tenures lower the EMI but raise total interest.');
    }

    function setYear(btn, open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var key = btn.getAttribute('data-year');
      $$('#amortBody tr[data-parent="' + key + '"]').forEach(function (r) { r.hidden = !open; });
      if (open) expanded[key] = true; else delete expanded[key];
    }

    function renderSchedule(plan) {
      var hasPrepay = plan.totalPrepaid > 0;
      var head = ['Year', 'Principal', 'Interest'].concat(hasPrepay ? ['Prepayment'] : [], ['Total paid', 'Balance', 'Loan paid']);
      var headRow = $('#amortHead');
      headRow.textContent = '';
      head.forEach(function (h) { headRow.appendChild(CW.el('th', { scope: 'col', text: h })); });

      var groups = CW.groupByYear(plan.rows, basis, plan.principal);
      var frag = document.createDocumentFragment();
      groups.forEach(function (g, gi) {
        var key = 'y' + gi, open = allExpanded || !!expanded[key];
        var btn = CW.el('button', { type: 'button', 'aria-expanded': open ? 'true' : 'false', 'data-year': key }, [
          CW.el('span', { class: 'material-symbols-outlined', 'aria-hidden': 'true', text: 'chevron_right' }), g.label
        ]);
        btn.addEventListener('click', function () { setYear(btn, btn.getAttribute('aria-expanded') !== 'true'); });
        var cells = [CW.el('th', { scope: 'row' }, [btn]), CW.el('td', { text: fmt(g.principal) }), CW.el('td', { text: fmt(g.interest) })];
        if (hasPrepay) cells.push(CW.el('td', { text: fmt(g.prepayment) }));
        cells.push(CW.el('td', { text: fmt(g.paid) }), CW.el('td', { text: fmt(g.closing) }), CW.el('td', { text: CW.formatPct(g.paidPct) }));
        frag.appendChild(CW.el('tr', { class: 'amort-year' }, cells));
        g.rows.forEach(function (r) {
          var mc = [CW.el('td', { text: CW.monthLabel(r.date) + ' · EMI ' + r.month }), CW.el('td', { text: fmt(r.principal) }), CW.el('td', { text: fmt(r.interest) })];
          if (hasPrepay) mc.push(CW.el('td', { text: r.prepayment ? fmt(r.prepayment) : '—' }));
          mc.push(CW.el('td', { text: fmt(r.emi + r.prepayment) }), CW.el('td', { text: fmt(r.closing) }), CW.el('td', { text: CW.formatPct(r.paidPct) }));
          var tr = CW.el('tr', { class: 'amort-month', 'data-parent': key }, mc);
          tr.hidden = !open;
          frag.appendChild(tr);
        });
      });
      var body = $('#amortBody');
      body.textContent = '';
      body.appendChild(frag);
      CW.setText('#amortSummary', plan.months + ' EMIs from ' + CW.monthLabel(plan.startDate) + ' to ' + CW.monthLabel(plan.endDate) + '.');
    }

    function renderTenureTable(st) {
      var P = amount.value, R = rate.value, cur = st.n;
      var list = [60, 120, 180, 240, 300, 360];
      if (list.indexOf(cur) < 0) list.push(cur);
      list.sort(function (a, b) { return a - b; });
      var body = $('#tenureBody');
      body.textContent = '';
      list.forEach(function (n) {
        var e = CW.emi(P, R, n), total = e * n, interest = total - P, isCur = n === cur;
        var label = CW.formatTenure(n) + ' (' + n + ' mo)';
        var first = CW.el('th', { scope: 'row', class: 'py-4 px-4 sm:px-6 font-semibold text-left' }, [
          CW.el('span', { class: 'inline-flex items-center gap-2' }, [
            CW.el('span', { class: 'w-2 h-2 rounded-full ' + (isCur ? 'bg-secondary' : 'bg-outline-variant'), 'aria-hidden': 'true' }),
            label,
            isCur ? CW.el('span', { class: 'px-2 py-0.5 rounded bg-secondary text-on-secondary font-label-sm text-label-sm', text: 'Current' }) : null
          ])
        ]);
        var ratio = CW.el('span', { class: 'px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold ' + (isCur ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface'), text: (interest / P).toFixed(2) + '×' });
        body.appendChild(CW.el('tr', { class: isCur ? 'bg-secondary-fixed/30' : 'hover:bg-surface-container-low' }, [
          first,
          CW.el('td', { class: 'py-4 px-4 sm:px-6 font-bold text-primary', text: fmt(e) }),
          CW.el('td', { class: 'py-4 px-4 sm:px-6 text-secondary font-medium', text: fmt(interest) }),
          CW.el('td', { class: 'py-4 px-4 sm:px-6 font-medium', text: fmt(total) }),
          CW.el('td', { class: 'py-4 px-4 sm:px-6 text-right' }, [ratio])
        ]));
      });

      var alt = cur + 60 <= L.months.max ? cur + 60 : (cur - 60 >= 12 ? cur - 60 : null);
      if (!alt) { CW.setText('#tenureInsight', 'Longer tenures lower the EMI but raise total interest.'); return; }
      var e0 = CW.emi(P, R, cur), e1 = CW.emi(P, R, alt), i0 = e0 * cur - P, i1 = e1 * alt - P;
      CW.setText('#tenureInsight', alt > cur
        ? 'Extending the tenure from ' + CW.formatTenure(cur) + ' to ' + CW.formatTenure(alt) + ' lowers the EMI by ' + fmt(e0 - e1) + '/month but adds ' + fmt(i1 - i0) + ' to total interest.'
        : 'Shortening the tenure from ' + CW.formatTenure(cur) + ' to ' + CW.formatTenure(alt) + ' raises the EMI by ' + fmt(e1 - e0) + '/month but cuts total interest by ' + fmt(i0 - i1) + '.');
    }

    /* ------------------------------ actions ------------------------------ */
    function report() {
      var st = compute();
      if (!st) { CW.toast('Please correct the highlighted inputs first.'); return; }
      var plan = st.plan, base = st.base;
      var details = [
        ['Loan amount', fmt(amount.value)],
        ['Interest rate', CW.formatRate(rate.value) + '% p.a.'],
        ['Tenure', CW.formatTenure(st.n) + ' (' + st.n + ' months)'],
        ['First EMI month', CW.monthLabel(base.startDate)]
      ];
      if (CW.isNum(st.fee) && st.fee > 0) details.push(['Processing fee', fee.value + '% (' + fmt(st.fee) + ')' + (gstCheck.checked ? ' + GST ' + fmt(st.gst) : '')]);
      if (st.prepay) details.push(['Prepayment', prepayType.options[prepayType.selectedIndex].text + ' of ' + fmt(st.prepay.amount) + ' from EMI ' + st.prepay.startMonth + ' — ' + prepayMode.options[prepayMode.selectedIndex].text.toLowerCase()]);
      var results = [
        ['Monthly EMI', fmt(base.emi)],
        ['Total interest', fmt(plan.totalInterest)],
        ['Total amount payable', fmt(plan.totalPaid)],
        ['Number of EMIs', String(plan.months) + ' (last: ' + CW.monthLabel(plan.endDate) + ')']
      ];
      if (st.prepay) results.push(['Interest saved by prepayment', fmt(base.totalInterest - plan.totalInterest)]);
      if (CW.isNum(st.fee) && st.fee > 0) results.push(['Total cost incl. fees', fmt(plan.totalPaid + st.fee + st.gst)]);
      var hasPrepay = plan.totalPrepaid > 0;
      var groups = CW.groupByYear(plan.rows, basis, plan.principal);
      CW.printReport({
        title: 'EMI Calculation & Amortization Schedule',
        sections: [
          { heading: 'Loan details', pairs: details },
          { heading: 'Results', pairs: results },
          { heading: 'Amortization by ' + (basis === 'fy' ? 'financial year (April–March)' : 'calendar year'), table: {
            head: ['Year', 'Principal', 'Interest'].concat(hasPrepay ? ['Prepayment'] : [], ['Total paid', 'Balance', 'Loan paid']),
            rows: groups.map(function (g) {
              return [g.label, fmt(g.principal), fmt(g.interest)].concat(hasPrepay ? [fmt(g.prepayment)] : [], [fmt(g.paid), fmt(g.closing), CW.formatPct(g.paidPct)]);
            })
          } }
        ]
      });
    }
    $('#pdfBtn').addEventListener('click', report);
    $('#printBtn').addEventListener('click', report);

    $('#csvBtn').addEventListener('click', function () {
      var st = compute();
      if (!st) { CW.toast('Please correct the highlighted inputs first.'); return; }
      var rows = [['EMI no.', 'Month', 'Opening balance', 'EMI', 'Principal', 'Interest', 'Prepayment', 'Closing balance']];
      st.plan.rows.forEach(function (r) {
        rows.push([r.month, CW.monthLabel(r.date), CW.money2(r.opening), CW.money2(r.emi), CW.money2(r.principal), CW.money2(r.interest), CW.money2(r.prepayment), CW.money2(r.closing)]);
      });
      rows.push([]);
      rows.push(['Loan amount', CW.money2(amount.value)], ['Interest rate % p.a.', rate.value], ['Tenure (months)', st.n],
        ['Total interest', CW.money2(st.plan.totalInterest)], ['Total paid', CW.money2(st.plan.totalPaid)]);
      CW.downloadCSV('calcwise-emi-schedule.csv', rows);
    });

    function shareValues() {
      var v = { amount: amount.valid ? amount.value : undefined, rate: rate.valid ? rate.value : undefined,
        tenure: tenure.valid ? tenure.field.value : undefined, unit: tenure.unit, start: startInput.value || undefined };
      if (fee.valid && fee.value > 0) v.fee = fee.value;
      if (!gstCheck.checked) v.gst = 0;
      if (prepayType.value !== 'none') {
        v.ptype = prepayType.value; v.pmode = prepayMode.value;
        if (prepayAmount.valid) v.pamt = prepayAmount.value;
        if (prepayMonth.valid) v.pmonth = prepayMonth.value;
      }
      return v;
    }
    $('#shareBtn').addEventListener('click', function () {
      if (!(amount.valid && rate.valid && tenure.valid)) { CW.toast('Please correct the highlighted inputs first.'); return; }
      CW.shareLink(CW.shareUrl(shareValues()));
    });

    function resetAll() {
      amount.set(C.defaults.amount);
      rate.set(C.defaults.rate);
      tenure.setMonths(C.defaults.years * 12);
      fee.set(0);
      gstCheck.checked = true;
      startInput.value = CW.toMonthValue(CW.firstOfNextMonth());
      prepayType.value = 'none';
      prepayMode.value = 'tenure';
      prepayAmount.set(100000);
      prepayMonth.set(12);
      syncPrepayUi();
      basisGroup.select('cal', false);
      expanded = {}; allExpanded = false;
      $('#expandAllBtn').textContent = 'Expand all';
      if (window.history && history.replaceState) history.replaceState(null, '', location.pathname);
      queueRender();
    }
    $('#resetBtn').addEventListener('click', function () { resetAll(); CW.toast('Reset to default values.'); });

    /* --------------------------- URL parameters --------------------------- */
    (function loadParams() {
      var p = CW.getParams(), advanced = false, v;
      if ((v = CW.param(p, 'amount', 'amount')) !== undefined) amount.set(v);
      if ((v = CW.param(p, 'rate', 'rate')) !== undefined) rate.set(v);
      var unit = p.get('unit') === 'months' ? 'months' : 'years';
      if ((v = CW.param(p, 'tenure', unit)) !== undefined) {
        if (unit === 'years') tenure.setMonths(v * 12);
        else { tenure.setUnit('months', false); tenure.field.set(v); }
      }
      if ((v = CW.param(p, 'fee', 'fee')) !== undefined) { fee.set(v); advanced = true; }
      if (p.get('gst') === '0') { gstCheck.checked = false; advanced = true; }
      var start = CW.parseMonthValue(p.get('start'));
      if (start) startInput.value = CW.toMonthValue(start);
      var pt = p.get('ptype');
      if (PREPAY_TYPES.indexOf(pt) > 0) {
        prepayType.value = pt; advanced = true;
        if (p.get('pmode') === 'emi') prepayMode.value = 'emi';
        if ((v = CW.param(p, 'pamt', 'prepay')) !== undefined) prepayAmount.set(v);
        if ((v = CW.param(p, 'pmonth', 'month')) !== undefined) prepayMonth.set(v);
      }
      if (advanced) setDrawer(true);
    })();

    syncPrepayUi();
    render();
  });
})();
