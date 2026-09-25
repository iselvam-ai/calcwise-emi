/* CalcWise — loan comparison page */
(function () {
  'use strict';
  var CW = window.CalcWise;
  if (!CW) return;
  var $ = CW.$, $$ = CW.$$, C = CW.CONFIG, fmt = CW.formatINR, el = CW.el;

  CW.onReady(function () {
    var scheduled = false;
    function queueRender() {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function () { scheduled = false; render(); }, 0);
    }

    function makeOption(k) {
      var K = k.toUpperCase();
      return {
        key: k, name: 'Option ' + K,
        amount: new CW.Field({ input: $('#input' + K + '_amount'), slider: $('#slider' + K + '_amount'), error: $('#err' + K + '_amount'),
          rule: 'amount', format: CW.formatNumber, toSlider: CW.amountToPos, fromSlider: CW.posToAmount, sliderText: fmt, onChange: queueRender }),
        rate: new CW.Field({ input: $('#input' + K + '_rate'), slider: $('#slider' + K + '_rate'), error: $('#err' + K + '_rate'),
          rule: 'rate', format: CW.formatRate, sliderText: function (v) { return CW.formatRate(v) + ' percent'; }, onChange: queueRender }),
        years: new CW.Field({ input: $('#input' + K + '_tenure'), slider: $('#slider' + K + '_tenure'), error: $('#err' + K + '_tenure'),
          rule: 'years', sliderText: function (v) { return CW.plural(v, 'year', 'years'); }, onChange: queueRender }),
        fee: new CW.Field({ input: $('#input' + K + '_fee'), error: $('#err' + K + '_fee'), rule: 'fee',
          format: function (v) { return CW.formatRate(v); }, onChange: queueRender })
      };
    }
    var A = makeOption('a'), B = makeOption('b');
    var gstCheck = $('#gstCheck');
    gstCheck.addEventListener('change', queueRender);

    $$('.tenure-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        (btn.getAttribute('data-opt') === 'a' ? A : B).years.set(+btn.getAttribute('data-val'));
      });
    });

    function compute(o) {
      if (!(o.amount.valid && o.rate.valid && o.years.valid && o.fee.valid)) return null;
      var P = o.amount.value, n = o.years.value * 12;
      var s = CW.amortize({ principal: P, annualRate: o.rate.value, months: n });
      var fee = P * o.fee.value / 100, gst = gstCheck.checked ? fee * C.gstOnFeesPct / 100 : 0;
      var upfront = fee + gst;
      return {
        o: o, P: P, rate: o.rate.value, years: o.years.value, feePct: o.fee.value, n: n, s: s,
        emi: s.emi, interest: s.totalInterest, repay: s.totalPaid, fee: fee, gst: gst, upfront: upfront,
        total: s.totalPaid + upfront, apr: CW.effectiveAnnualRate(P - upfront, s.emi, n)
      };
    }

    function summary(r) { return CW.formatTenure(r.n) + ' @ ' + CW.formatRate(r.rate) + '% · fee ' + CW.formatRate(r.feePct) + '%'; }

    // "Option X is ₹N lower …" helper. lowerIsBetter-neutral: it only states which is lower.
    function lowerOf(a, b, value, fmtFn, noun, eps) {
      var d = value(a) - value(b);
      if (Math.abs(d) < (eps || 0.5)) return 'Same ' + noun;
      var lo = d < 0 ? a : b;
      return lo.o.name + ' is ' + fmtFn(Math.abs(d)) + ' lower';
    }

    function render() {
      var gst = gstCheck.checked;
      $$('.gst-note').forEach(function (n) { n.hidden = !gst; });
      var a = compute(A), b = compute(B);
      [[A, a], [B, b]].forEach(function (pair) {
        var K = pair[0].key.toUpperCase(), r = pair[1];
        CW.setText('#card' + K + '_emi', r ? fmt(r.emi) : '—');
        CW.setText('#summary' + K, r ? summary(r) : 'Check inputs');
        CW.setText('#card' + K + '_fee', r ? fmt(r.upfront) : '—');
        CW.setText('#months' + K, pair[0].years.valid ? CW.plural(pair[0].years.value * 12, 'monthly EMI', 'monthly EMIs') : '—');
      });
      if (!a || !b) return renderEmpty(!a ? A : B);

      renderNotice(a, b);
      renderTable(a, b);
      renderBars(a, b);
      renderTimeline(a, b);
      renderProfiles(a, b);
    }

    function renderEmpty(bad) {
      CW.setText('#diffNotice', 'Correct the highlighted inputs in ' + bad.name + ' to see the comparison.');
      var body = $('#compareBody');
      body.textContent = '';
      body.appendChild(el('tr', null, [el('td', { class: 'py-5 px-4 sm:px-8', colspan: '4', text: 'Comparison unavailable until all inputs are valid.' })]));
      ['#chart_sum_a', '#chart_sum_b', '#chartA_p_val', '#chartA_i_val', '#chartA_f_val', '#chartB_p_val', '#chartB_i_val',
        '#chartB_f_val', '#emiDeltaText', '#chart_net_delta', '#ratioText'].forEach(function (id) { CW.setText(id, '—'); });
      ['A', 'B'].forEach(function (K) { ['p', 'i', 'f'].forEach(function (x) { $('#chart' + K + '_' + x + '_bar').style.width = '0%'; }); });
      $('#timeline').textContent = '';
      $('#profileA').textContent = '';
      $('#profileB').textContent = '';
      CW.setText('#thA', 'Option A');
      CW.setText('#thB', 'Option B');
    }

    function renderNotice(a, b) {
      var diffs = [];
      if (a.rate !== b.rate) diffs.push('interest rate (' + CW.formatRate(a.rate) + '% vs ' + CW.formatRate(b.rate) + '%)');
      if (a.n !== b.n) diffs.push('tenure (' + CW.formatTenure(a.n) + ' vs ' + CW.formatTenure(b.n) + ')');
      if (a.feePct !== b.feePct) diffs.push('processing fee (' + CW.formatRate(a.feePct) + '% vs ' + CW.formatRate(b.feePct) + '%)');
      if (a.P !== b.P) diffs.push('loan amount (' + fmt(a.P) + ' vs ' + fmt(b.P) + ')');
      var text = diffs.length ? 'The options differ in ' + diffs.join(', ') + '. ' : 'Both options have identical inputs. ';
      text += gstCheck.checked ? 'GST at ' + C.gstOnFeesPct + '% is added to processing fees. ' : 'GST on processing fees is not included. ';
      if (a.P !== b.P) text += 'Because the loan amounts differ, total interest and total cost are not like-for-like; the effective annual rate is a fairer basis.';
      else if (a.n !== b.n) text += 'Because the tenures differ, a lower total cost comes with a higher EMI, and vice versa.';
      CW.setText('#diffNotice', text);
    }

    function row(label, sub, va, vb, diff) {
      return el('tr', { class: 'hover:bg-surface-container-low/50' }, [
        el('th', { scope: 'row', class: 'py-4 px-4 sm:px-8 font-semibold text-primary align-top' }, [
          label, sub ? el('span', { class: 'block font-label-sm text-label-sm text-on-surface-variant font-normal mt-0.5', text: sub }) : null
        ]),
        el('td', { class: 'py-4 px-4 sm:px-6 font-bold text-primary align-top', 'data-label': 'Option A', text: va }),
        el('td', { class: 'py-4 px-4 sm:px-6 font-bold text-primary align-top', 'data-label': 'Option B', text: vb }),
        el('td', { class: 'py-4 px-4 sm:px-8 align-top', 'data-label': 'Difference' }, [el('span', { class: 'inline-block px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md', text: diff })])
      ]);
    }

    function tableRows(a, b) {
      var pct = function (v) { return v.toFixed(2) + ' pts'; };
      var tenureDiff = a.n === b.n ? 'Same tenure' : (a.n < b.n ? a : b).o.name + ' is repaid ' + CW.formatTenure(Math.abs(a.n - b.n)) + ' sooner';
      var aprDiff = (CW.isNum(a.apr) && CW.isNum(b.apr)) ? lowerOf(a, b, function (x) { return x.apr; }, pct, 'effective rate', 0.005) : '—';
      return [
        ['Monthly EMI', 'Paid every month', fmt(a.emi), fmt(b.emi), lowerOf(a, b, function (x) { return x.emi; }, function (v) { return fmt(v) + '/month'; }, 'EMI')],
        ['Tenure', 'Years (number of monthly EMIs)', CW.formatTenure(a.n) + ' (' + a.n + ')', CW.formatTenure(b.n) + ' (' + b.n + ')', tenureDiff],
        ['Total interest', 'Over the full tenure', fmt(a.interest), fmt(b.interest), lowerOf(a, b, function (x) { return x.interest; }, fmt, 'total interest')],
        ['Processing fee' + (gstCheck.checked ? ' + GST' : ''), 'Paid upfront', fmt(a.upfront), fmt(b.upfront), lowerOf(a, b, function (x) { return x.upfront; }, fmt, 'upfront fees')],
        ['Total repayment', 'Principal + interest', fmt(a.repay), fmt(b.repay), lowerOf(a, b, function (x) { return x.repay; }, fmt, 'total repayment')],
        ['Total cost', 'Principal + interest + fees', fmt(a.total), fmt(b.total), lowerOf(a, b, function (x) { return x.total; }, fmt, 'total cost') + (a.P !== b.P ? ' (different loan amounts)' : '')],
        ['Effective annual rate', 'Including fees (approx.)', CW.isNum(a.apr) ? a.apr.toFixed(2) + '%' : '—', CW.isNum(b.apr) ? b.apr.toFixed(2) + '%' : '—', aprDiff]
      ];
    }

    function renderTable(a, b) {
      CW.setText('#thA', 'Option A (' + CW.formatTenure(a.n) + ' @ ' + CW.formatRate(a.rate) + '%)');
      CW.setText('#thB', 'Option B (' + CW.formatTenure(b.n) + ' @ ' + CW.formatRate(b.rate) + '%)');
      var body = $('#compareBody');
      body.textContent = '';
      tableRows(a, b).forEach(function (r) { body.appendChild(row(r[0], r[1], r[2], r[3], r[4])); });
    }

    function renderBars(a, b) {
      [[a, 'A', 'a'], [b, 'B', 'b']].forEach(function (x) {
        var r = x[0], K = x[1];
        $('#chart' + K + '_p_bar').style.width = (r.P / r.total * 100) + '%';
        $('#chart' + K + '_i_bar').style.width = (r.interest / r.total * 100) + '%';
        $('#chart' + K + '_f_bar').style.width = (r.upfront / r.total * 100) + '%';
        CW.setText('#chart_sum_' + x[2], CW.formatShortINR(r.total));
        CW.setText('#chart' + K + '_p_val', CW.formatShortINR(r.P));
        CW.setText('#chart' + K + '_i_val', CW.formatShortINR(r.interest));
        CW.setText('#chart' + K + '_f_val', fmt(r.upfront));
      });
      var de = a.emi - b.emi;
      CW.setText('#emiDeltaText', Math.abs(de) < 0.5 ? 'Both EMIs are the same' : (de > 0 ? 'Option A' : 'Option B') + '’s EMI is ' + fmt(Math.abs(de)) + ' higher per month');
      var dt = a.total - b.total;
      CW.setText('#chart_net_delta', Math.abs(dt) < 0.5 ? 'Same total cost' : (dt < 0 ? 'Option A' : 'Option B') + ': ' + fmt(Math.abs(dt)) + ' lower total cost');
      CW.setText('#ratioText', Math.round(a.interest / a.P * 100) + '% (A) vs ' + Math.round(b.interest / b.P * 100) + '% (B)');
    }

    function renderTimeline(a, b) {
      var list = $('#timeline');
      list.textContent = '';
      function item(color, when, title, note) {
        list.appendChild(el('li', { class: 'relative' }, [
          el('span', { class: 'absolute -left-6 top-1 w-3 h-3 rounded-full ' + color, 'aria-hidden': 'true' }),
          el('span', { class: 'font-label-sm text-label-sm text-on-surface-variant block', text: when }),
          el('p', { class: 'font-label-lg text-label-lg font-semibold text-primary', text: title }),
          note ? el('p', { class: 'font-body-sm text-body-sm text-on-surface-variant mt-0.5', text: note }) : null
        ]));
      }
      item('bg-secondary', 'Start', 'Loans disbursed', a.P === b.P ? fmt(a.P) + ' each' : 'A: ' + fmt(a.P) + ' · B: ' + fmt(b.P));
      if (a.n === b.n) {
        item('bg-primary', 'After ' + CW.formatTenure(a.n) + ' (' + CW.monthLabel(a.s.endDate) + ')', 'Both options fully repaid', null);
        return;
      }
      var first = a.n < b.n ? a : b, second = a.n < b.n ? b : a;
      var left = CW.balanceAfter(second.P, second.rate, second.n, first.n);
      item('bg-secondary-container', 'After ' + CW.formatTenure(first.n) + ' (' + CW.monthLabel(first.s.endDate) + ')', first.o.name + ' fully repaid',
        second.o.name + ' still has about ' + fmt(left) + ' outstanding and ' + CW.plural(second.n - first.n, 'EMI', 'EMIs') + ' to go.');
      item('bg-primary', 'After ' + CW.formatTenure(second.n) + ' (' + CW.monthLabel(second.s.endDate) + ')', second.o.name + ' fully repaid', null);
    }

    function renderProfiles(a, b) {
      [[a, b, '#profileA', '#profileTitleA'], [b, a, '#profileB', '#profileTitleB']].forEach(function (x) {
        var me = x[0], other = x[1], items = [], priorities = [];
        if (other.emi - me.emi >= 0.5) { items.push('Lower EMI: ' + fmt(other.emi - me.emi) + ' less per month than ' + other.o.name + '.'); priorities.push('lower monthly payments'); }
        if (me.n < other.n) { items.push('Shorter repayment: finishes ' + CW.formatTenure(other.n - me.n) + ' earlier.'); priorities.push('a shorter repayment period'); }
        if (other.interest - me.interest >= 0.5) items.push('Lower total interest: ' + fmt(other.interest - me.interest) + ' less over the loan.');
        if (other.total - me.total >= 0.5) { items.push('Lower total cost including fees: ' + fmt(other.total - me.total) + ' less' + (me.P !== other.P ? ' (loan amounts differ).' : '.')); priorities.push('a lower total cost'); }
        if (other.upfront - me.upfront >= 0.5) { items.push('Lower upfront fees: ' + fmt(other.upfront - me.upfront) + ' less at the start.'); priorities.push('lower upfront fees'); }
        if (me.emi - other.emi >= 0.5) items.push('Needs ' + fmt(me.emi - other.emi) + ' more per month than ' + other.o.name + ' — check that this fits your budget.');
        CW.setText(x[3], priorities.length
          ? me.o.name + ' may suit borrowers who prioritise ' + joinList(priorities)
          : me.o.name + ': no lower EMI, cost or tenure on these inputs');
        var ul = $(x[2]);
        ul.textContent = '';
        if (!items.length) items.push('On these inputs, this option is not lower on any measure compared with ' + other.o.name + '.');
        items.forEach(function (t) {
          ul.appendChild(el('li', { class: 'flex items-start gap-2.5' }, [
            el('span', { class: 'material-symbols-outlined text-secondary text-[18px] mt-0.5', 'aria-hidden': 'true', text: 'check_circle' }),
            el('span', { text: t })
          ]));
        });
      });
    }
    function joinList(arr) { return arr.length < 2 ? arr[0] : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]; }

    /* ------------------------------ actions ------------------------------ */
    $('#downloadPdfBtn').addEventListener('click', function () {
      var a = compute(A), b = compute(B);
      if (!a || !b) { CW.toast('Please correct the highlighted inputs first.'); return; }
      var inputs = function (r) { return [fmt(r.P), CW.formatRate(r.rate) + '%', CW.formatTenure(r.n), CW.formatRate(r.feePct) + '%']; };
      var ia = inputs(a), ib = inputs(b);
      CW.printReport({
        title: 'Loan Comparison',
        sections: [
          { heading: 'Inputs', table: { head: ['', 'Option A', 'Option B'], rows: [
            ['Loan amount', ia[0], ib[0]], ['Interest rate (p.a.)', ia[1], ib[1]], ['Tenure', ia[2], ib[2]], ['Processing fee', ia[3], ib[3]],
            ['GST on fee', gstCheck.checked ? C.gstOnFeesPct + '%' : 'Not included', gstCheck.checked ? C.gstOnFeesPct + '%' : 'Not included']
          ] } },
          { heading: 'Results', table: { head: ['Measure', 'Option A', 'Option B', 'Difference'], rows: tableRows(a, b).map(function (r) { return [r[0], r[2], r[3], r[4]]; }) },
            notes: [$('#diffNotice').textContent, 'Total cost = principal + total interest + processing fee (+ GST if selected). Other charges such as legal, valuation, insurance, stamp duty and prepayment charges are not included. This comparison does not recommend either option.'] }
        ]
      });
    });

    function shareValues() {
      var v = {};
      [['a', A], ['b', B]].forEach(function (x) {
        var k = x[0], o = x[1];
        if (o.amount.valid) v[k + '_amt'] = o.amount.value;
        if (o.rate.valid) v[k + '_rate'] = o.rate.value;
        if (o.years.valid) v[k + '_yrs'] = o.years.value;
        if (o.fee.valid) v[k + '_fee'] = o.fee.value;
      });
      if (!gstCheck.checked) v.gst = 0;
      return v;
    }
    $('#copyShareBtn').addEventListener('click', function () {
      if (!compute(A) || !compute(B)) { CW.toast('Please correct the highlighted inputs first.'); return; }
      CW.shareLink(CW.shareUrl(shareValues()));
    });
    $('#ctaAdjust').addEventListener('click', function () {
      var target = $('#inputs');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { $('#inputA_amount').focus({ preventScroll: true }); }, 400);
    });

    function apply(o, d) { o.amount.set(d.amount); o.rate.set(d.rate); o.years.set(d.years); o.fee.set(d.feePct); }
    $('#resetBtn').addEventListener('click', function () {
      apply(A, C.comparisonDefaults.a);
      apply(B, C.comparisonDefaults.b);
      gstCheck.checked = true;
      if (window.history && history.replaceState) history.replaceState(null, '', location.pathname);
      queueRender();
      CW.toast('Reset to default values.');
    });

    (function loadParams() {
      var p = CW.getParams(), v;
      [['a', A], ['b', B]].forEach(function (x) {
        var k = x[0], o = x[1];
        if ((v = CW.param(p, k + '_amt', 'amount')) !== undefined) o.amount.set(v);
        if ((v = CW.param(p, k + '_rate', 'rate')) !== undefined) o.rate.set(v);
        if ((v = CW.param(p, k + '_yrs', 'years')) !== undefined) o.years.set(v);
        if ((v = CW.param(p, k + '_fee', 'fee')) !== undefined) o.fee.set(v);
      });
      if (p.get('gst') === '0') gstCheck.checked = false;
    })();
    render();
  });
})();
