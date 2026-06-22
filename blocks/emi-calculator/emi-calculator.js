// Interactive EMI calculator (e.g. the car-loan EMI calculator page). Renders
// three labelled inputs — loan amount, interest rate and tenure — each with a
// range slider, plus a live result panel (monthly EMI, principal, interest
// payable, total payable). Recomputes on every input change. Config (min/max/
// step/defaults + labels) comes from the block's first row data attributes,
// injected by the buildEmiCalculator autoblock in scripts.js.

function formatINR(n) {
  return Math.round(n).toLocaleString('en-IN');
}

// Standard reducing-balance EMI: P r (1+r)^n / ((1+r)^n - 1), r = monthly rate.
function computeEmi(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const pow = (1 + r) ** months;
  return (principal * r * pow) / (pow - 1);
}

function field(cfg) {
  const wrap = document.createElement('div');
  wrap.className = 'emi-field';
  wrap.innerHTML = `
    <div class="emi-field-row">
      <label class="emi-label">${cfg.label}</label>
      <span class="emi-value-box">
        <input type="text" inputmode="numeric" class="emi-input" data-key="${cfg.key}" value="${cfg.format(cfg.value)}">
        <span class="emi-unit">${cfg.unit}</span>
      </span>
    </div>
    <input type="range" class="emi-slider" data-key="${cfg.key}"
      min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${cfg.value}">
    <div class="emi-scale">
      <span>${cfg.scaleMin}</span><span>${cfg.scaleMax}</span>
    </div>`;
  return wrap;
}

export default function decorate(block) {
  const d = block.dataset;
  const tenureUnit = d.tenureUnit || 'Years';
  // tenure config is in the unit shown (years), converted to months for EMI.
  const state = {
    amount: Number(d.amount) || 5000000,
    rate: Number(d.rate) || 8,
    tenure: Number(d.tenure) || 5,
  };

  const fields = [
    {
      key: 'amount',
      label: 'My <strong>loan requirement</strong> is',
      unit: 'INR',
      min: Number(d.amountMin) || 100000,
      max: Number(d.amountMax) || 10000000,
      step: Number(d.amountStep) || 50000,
      value: state.amount,
      format: formatINR,
      scaleMin: d.amountScaleMin || '1L',
      scaleMax: d.amountScaleMax || '100L',
    },
    {
      key: 'rate',
      label: 'I\'m looking at an <strong>interest rate</strong> of',
      unit: '%',
      min: Number(d.rateMin) || 8,
      max: Number(d.rateMax) || 24,
      step: Number(d.rateStep) || 1,
      value: state.rate,
      format: (v) => v,
      scaleMin: String(d.rateMin || 8),
      scaleMax: String(d.rateMax || 24),
    },
    {
      key: 'tenure',
      label: 'I plan to repay the loan amount in',
      unit: tenureUnit,
      min: Number(d.tenureMin) || 1,
      max: Number(d.tenureMax) || 7,
      step: Number(d.tenureStep) || 1,
      value: state.tenure,
      format: (v) => v,
      scaleMin: String(d.tenureMin || 1),
      scaleMax: String(d.tenureMax || 7),
    },
  ];

  const controls = document.createElement('div');
  controls.className = 'emi-controls';
  fields.forEach((f) => controls.append(field(f)));

  const result = document.createElement('div');
  result.className = 'emi-result';
  result.innerHTML = `
    <p class="emi-result-label">Your monthly EMI is</p>
    <p class="emi-result-emi" data-out="emi"></p>
    <p class="emi-result-context" data-out="context"></p>
    <div class="emi-result-breakdown">
      <p class="emi-result-key">Principal:</p>
      <p class="emi-result-val" data-out="principal"></p>
      <p class="emi-result-key">Interest Payable:</p>
      <p class="emi-result-val" data-out="interest"></p>
      <p class="emi-result-key">Total Amount Payable:</p>
      <p class="emi-result-val" data-out="total"></p>
    </div>`;
  if (d.applyHref) {
    const apply = document.createElement('p');
    apply.className = 'emi-result-apply';
    apply.innerHTML = `<a href="${d.applyHref}">Apply Now</a>`;
    result.append(apply);
  }

  block.textContent = '';
  block.append(controls, result);

  const out = (key) => result.querySelector(`[data-out="${key}"]`);
  function render() {
    const months = tenureUnit.toLowerCase().startsWith('month')
      ? state.tenure : state.tenure * 12;
    const emi = computeEmi(state.amount, state.rate, months);
    const total = emi * months;
    const interest = total - state.amount;
    out('emi').textContent = formatINR(emi);
    const yrs = tenureUnit.toLowerCase().startsWith('month')
      ? `${state.tenure} months` : `${state.tenure} years`;
    out('context').textContent = `at ${state.rate}% interest rate for ${yrs}`;
    out('principal').textContent = formatINR(state.amount);
    out('interest').textContent = formatINR(interest);
    out('total').textContent = formatINR(total);
  }

  // Keep slider + text input + state in sync.
  block.querySelectorAll('.emi-slider').forEach((slider) => {
    slider.addEventListener('input', () => {
      const { key } = slider.dataset;
      state[key] = Number(slider.value);
      const input = block.querySelector(`.emi-input[data-key="${key}"]`);
      const fcfg = fields.find((f) => f.key === key);
      input.value = fcfg.format(state[key]);
      render();
    });
  });
  block.querySelectorAll('.emi-input').forEach((input) => {
    input.addEventListener('change', () => {
      const { key } = input.dataset;
      const fcfg = fields.find((f) => f.key === key);
      let v = Number(String(input.value).replace(/[^0-9.]/g, ''));
      if (Number.isNaN(v)) v = fcfg.min;
      v = Math.min(fcfg.max, Math.max(fcfg.min, v));
      state[key] = v;
      input.value = fcfg.format(v);
      block.querySelector(`.emi-slider[data-key="${key}"]`).value = v;
      render();
    });
  });

  render();
}
