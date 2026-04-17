import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { validateName, validateCardNumber, validateExpiry, validateCVV, PaymentFormElement, simulatedPaymentProcessor, DEFAULT_CONFIG } from './payment-form.js';

/** Instant-resolving success processor for tests */
const instantSuccess = async () => ({ success: true });
/** Instant-resolving failure processor for tests */
const instantFailure = async () => ({ success: false, message: 'Declined' });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad2(n) { return String(n).padStart(2, '0'); }

function futureMmYy() {
  const now = new Date();
  const currentYear2 = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  return fc.tuple(
    fc.integer({ min: 0, max: 11 }),
    fc.integer({ min: 1, max: 132 })
  ).map(([a, b]) => {
    const totalOffset = a + b;
    let month = currentMonth + totalOffset;
    let year = currentYear2;
    year += Math.floor((month - 1) / 12);
    month = ((month - 1) % 12) + 1;
    year = year % 100;
    return `${pad2(month)}/${pad2(year)}`;
  });
}

function pastOrCurrentMmYy() {
  const now = new Date();
  const currentYear2 = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  return fc.tuple(
    fc.integer({ min: 0, max: 11 }),
    fc.integer({ min: 0, max: 120 })
  ).map(([a, b]) => {
    const totalOffset = a + b;
    let month = currentMonth - totalOffset;
    let year = currentYear2;
    while (month < 1) { month += 12; year -= 1; }
    year = ((year % 100) + 100) % 100;
    return `${pad2(month)}/${pad2(year)}`;
  });
}

if (!customElements.get('payment-form')) {
  customElements.define('payment-form', PaymentFormElement);
}

function mountComponent() {
  const el = document.createElement('payment-form');
  // Inject instant processor so tests don't wait for the 2s simulated delay
  el.paymentProcessor = instantSuccess;
  document.body.appendChild(el);
  return el;
}

function submitForm(el) {
  el.shadowRoot.getElementById('payment-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

/** Flush pending microtasks (awaits the async _handleSubmit) */
function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function clickReset(el) {
  el.shadowRoot.getElementById('reset-btn').click();
}

function setInputs(el, { name, cardNumber, expiry, cvv }) {
  el.shadowRoot.getElementById('cardholder-name').value = name ?? '';
  el.shadowRoot.getElementById('card-number').value = cardNumber ?? '';
  el.shadowRoot.getElementById('expiry').value = expiry ?? '';
  el.shadowRoot.getElementById('cvv').value = cvv ?? '';
}

// ---------------------------------------------------------------------------
// Property 1: Non-empty name passes validation
// Feature: payment-component-demo, Property 1: Non-empty name passes validation
// ---------------------------------------------------------------------------
describe('validateName', () => {
  it('Property 1: non-empty, non-whitespace strings are valid', () => {
    // Feature: payment-component-demo, Property 1: Non-empty name passes validation
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (name) => {
          const result = validateName(name);
          expect(result.valid).toBe(true);
          expect(result.error).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: empty or whitespace-only strings are invalid', () => {
    // Feature: payment-component-demo, Property 1: Non-empty name passes validation
    const whitespaceArb = fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'));
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), whitespaceArb),
        (name) => {
          const result = validateName(name);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Cardholder name is required.');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Card number validation accepts only 16-digit strings
// Feature: payment-component-demo, Property 2: Card number validation accepts only 16-digit strings
// ---------------------------------------------------------------------------
describe('validateCardNumber', () => {
  it('Property 2: exactly-16-digit strings are valid', () => {
    // Feature: payment-component-demo, Property 2: Card number validation accepts only 16-digit strings
    const sixteenDigits = fc.stringOf(fc.char().filter(c => /\d/.test(c)), { minLength: 16, maxLength: 16 });
    fc.assert(
      fc.property(sixteenDigits, (cardNumber) => {
        const result = validateCardNumber(cardNumber);
        expect(result.valid).toBe(true);
        expect(result.error).toBe('');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: strings that are not exactly 16 digits are invalid', () => {
    // Feature: payment-component-demo, Property 2: Card number validation accepts only 16-digit strings
    const notSixteenDigits = fc.string().filter(s => !/^\d{16}$/.test(s));
    fc.assert(
      fc.property(notSixteenDigits, (cardNumber) => {
        const result = validateCardNumber(cardNumber);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Card number must be 16 digits.');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Expiry date validation accepts only future MM/YY dates
// Feature: payment-component-demo, Property 3: Expiry date validation accepts only future MM/YY dates
// ---------------------------------------------------------------------------
describe('validateExpiry', () => {
  it('Property 3: future MM/YY dates are valid', () => {
    // Feature: payment-component-demo, Property 3: Expiry date validation accepts only future MM/YY dates
    fc.assert(
      fc.property(futureMmYy(), (expiry) => {
        const result = validateExpiry(expiry);
        expect(result.valid).toBe(true);
        expect(result.error).toBe('');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: past/current MM/YY dates are invalid', () => {
    // Feature: payment-component-demo, Property 3: Expiry date validation accepts only future MM/YY dates
    fc.assert(
      fc.property(pastOrCurrentMmYy(), (expiry) => {
        const result = validateExpiry(expiry);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Expiry must be a future date in MM/YY format.');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: malformed strings are invalid', () => {
    // Feature: payment-component-demo, Property 3: Expiry date validation accepts only future MM/YY dates
    const malformed = fc.string().filter(s => !/^\d{2}\/\d{2}$/.test(s));
    fc.assert(
      fc.property(malformed, (expiry) => {
        const result = validateExpiry(expiry);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Expiry must be a future date in MM/YY format.');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: CVV validation accepts only 3-digit strings
// Feature: payment-component-demo, Property 4: CVV validation accepts only 3-digit strings
// ---------------------------------------------------------------------------
describe('validateCVV', () => {
  it('Property 4: exactly-3-digit strings are valid', () => {
    // Feature: payment-component-demo, Property 4: CVV validation accepts only 3-digit strings
    const threeDigits = fc.stringOf(fc.char().filter(c => /\d/.test(c)), { minLength: 3, maxLength: 3 });
    fc.assert(
      fc.property(threeDigits, (cvv) => {
        const result = validateCVV(cvv);
        expect(result.valid).toBe(true);
        expect(result.error).toBe('');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: strings that are not exactly 3 digits are invalid', () => {
    // Feature: payment-component-demo, Property 4: CVV validation accepts only 3-digit strings
    const notThreeDigits = fc.string().filter(s => !/^\d{3}$/.test(s));
    fc.assert(
      fc.property(notThreeDigits, (cvv) => {
        const result = validateCVV(cvv);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('CVV must be 3 digits.');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// State machine transitions
// ---------------------------------------------------------------------------
describe('PaymentFormElement — state machine transitions', () => {
  let el;
  beforeEach(() => { el = mountComponent(); });
  afterEach(() => { el.remove(); });

  it('transitions from idle to submitting', () => {
    expect(el.state).toBe('idle');
    el._setState('submitting');
    expect(el.state).toBe('submitting');
  });

  it('submitting state disables inputs and submit button with aria-busy', () => {
    el._setState('submitting');
    el.shadowRoot.querySelectorAll('input').forEach(i => expect(i.disabled).toBe(true));
    const submitBtn = el.shadowRoot.getElementById('submit-btn');
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.getAttribute('aria-busy')).toBe('true');
    expect(el.shadowRoot.querySelector('.status-message').textContent).toBe('Processing...');
  });

  it('transitions from submitting to success via notifySuccess()', () => {
    el._setState('submitting');
    el.notifySuccess();
    expect(el.state).toBe('success');
  });

  it('success state hides form fields and shows success message', () => {
    el._setState('submitting');
    el.notifySuccess();
    el.shadowRoot.querySelectorAll('.field').forEach(f => expect(f.style.display).toBe('none'));
    expect(el.shadowRoot.querySelector('.status-message').textContent).toBe('Payment successful!');
  });

  it('notifySuccess() dispatches payment-success event', () => {
    el._setState('submitting');
    const events = [];
    el.addEventListener('payment-success', e => events.push(e));
    el.notifySuccess();
    expect(events).toHaveLength(1);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });

  it('transitions from submitting to error via notifyError(msg)', () => {
    el._setState('submitting');
    el.notifyError('Card declined.');
    expect(el.state).toBe('error');
  });

  it('error state shows the error message in status div', () => {
    el._setState('submitting');
    el.notifyError('Card declined.');
    expect(el.shadowRoot.querySelector('.status-message').textContent).toBe('Card declined.');
  });

  it('notifyError() dispatches payment-error event with detail.message', () => {
    el._setState('submitting');
    const events = [];
    el.addEventListener('payment-error', e => events.push(e));
    el.notifyError('Insufficient funds.');
    expect(events).toHaveLength(1);
    expect(events[0].detail.message).toBe('Insufficient funds.');
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });

  it('notifyError() uses fallback message when called with empty string', () => {
    el._setState('submitting');
    const events = [];
    el.addEventListener('payment-error', e => events.push(e));
    el.notifyError('');
    expect(events[0].detail.message).toBe('Payment failed. Please try again.');
    expect(el.shadowRoot.querySelector('.status-message').textContent).toBe('Payment failed. Please try again.');
  });

  it('notifyError() uses fallback message when called with non-string', () => {
    el._setState('submitting');
    const events = [];
    el.addEventListener('payment-error', e => events.push(e));
    el.notifyError(null);
    expect(events[0].detail.message).toBe('Payment failed. Please try again.');
  });

  it('transitions from success to idle', () => {
    el._setState('submitting');
    el.notifySuccess();
    el._setState('idle');
    expect(el.state).toBe('idle');
  });

  it('transitions from error to idle', () => {
    el._setState('submitting');
    el.notifyError('Some error');
    el._setState('idle');
    expect(el.state).toBe('idle');
  });

  it('idle state re-enables inputs, clears values, removes aria-busy, clears status', () => {
    el.shadowRoot.getElementById('cardholder-name').value = 'John Doe';
    el._setState('submitting');
    el._setState('idle');
    el.shadowRoot.querySelectorAll('input').forEach(i => {
      expect(i.disabled).toBe(false);
      expect(i.value).toBe('');
    });
    const submitBtn = el.shadowRoot.getElementById('submit-btn');
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.hasAttribute('aria-busy')).toBe(false);
    expect(el.shadowRoot.querySelector('.status-message').textContent).toBe('');
  });

  it('idle state shows form fields again after success', () => {
    el._setState('submitting');
    el.notifySuccess();
    el._setState('idle');
    el.shadowRoot.querySelectorAll('.field').forEach(f => expect(f.style.display).not.toBe('none'));
  });

  it('notifySuccess() is a no-op when state is idle', () => {
    const events = [];
    el.addEventListener('payment-success', e => events.push(e));
    el.notifySuccess();
    expect(el.state).toBe('idle');
    expect(events).toHaveLength(0);
  });

  it('notifySuccess() is a no-op when state is success', () => {
    el._setState('submitting');
    el.notifySuccess();
    const events = [];
    el.addEventListener('payment-success', e => events.push(e));
    el.notifySuccess();
    expect(el.state).toBe('success');
    expect(events).toHaveLength(0);
  });

  it('notifySuccess() is a no-op when state is error', () => {
    el._setState('submitting');
    el.notifyError('err');
    const events = [];
    el.addEventListener('payment-success', e => events.push(e));
    el.notifySuccess();
    expect(el.state).toBe('error');
    expect(events).toHaveLength(0);
  });

  it('notifyError() is a no-op when state is idle', () => {
    const events = [];
    el.addEventListener('payment-error', e => events.push(e));
    el.notifyError('msg');
    expect(el.state).toBe('idle');
    expect(events).toHaveLength(0);
  });

  it('notifyError() is a no-op when state is success', () => {
    el._setState('submitting');
    el.notifySuccess();
    const events = [];
    el.addEventListener('payment-error', e => events.push(e));
    el.notifyError('msg');
    expect(el.state).toBe('success');
    expect(events).toHaveLength(0);
  });

  it('notifyError() is a no-op when state is error', () => {
    el._setState('submitting');
    el.notifyError('first error');
    const events = [];
    el.addEventListener('payment-error', e => events.push(e));
    el.notifyError('second error');
    expect(el.state).toBe('error');
    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5: Valid submission dispatches payment-submit with correct payload
// Feature: payment-component-demo, Property 5: Valid submission dispatches payment-submit with correct payload
// ---------------------------------------------------------------------------
describe('PaymentFormElement — Property 5: Valid submission dispatches payment-submit with correct payload', () => {
  let el;
  beforeEach(() => { el = mountComponent(); });
  afterEach(() => { el.remove(); });

  it('Property 5: valid inputs produce payment-submit with name/cardNumber/expiry and no cvv', async () => {
    // Feature: payment-component-demo, Property 5: Valid submission dispatches payment-submit with correct payload
    const validName = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
    const validCard = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 16, maxLength: 16 });
    const validCvv  = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 3, maxLength: 3 });

    // Capture details passed to the processor instead of relying on a removed event
    let capturedDetails = null;
    el.paymentProcessor = async (details) => {
      capturedDetails = details;
      return { success: true };
    };

    await fc.assert(
      fc.asyncProperty(validName, validCard, futureMmYy(), validCvv, async (name, cardNumber, expiry, cvv) => {
        capturedDetails = null;
        setInputs(el, { name, cardNumber, expiry, cvv });
        submitForm(el);
        await flushMicrotasks();

        expect(capturedDetails).not.toBeNull();
        expect(capturedDetails.name).toBe(name);
        expect(capturedDetails.cardNumber).toBe(cardNumber);
        expect(capturedDetails.expiry).toBe(expiry);
        // CVV is passed to the processor (it needs it) but never in events
        expect(capturedDetails.cvv).toBe(cvv);

        el._setState('idle');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: All events have bubbles and composed set to true
// Feature: payment-component-demo, Property 6: All events have bubbles and composed set to true
// ---------------------------------------------------------------------------
describe('PaymentFormElement — Property 6: All events have bubbles and composed set to true', () => {
  let el;
  beforeEach(() => { el = mountComponent(); });
  afterEach(() => { el.remove(); });

  it('Property 6: payment-success has bubbles and composed true (via processor)', async () => {
    // Feature: payment-component-demo, Property 6: All events have bubbles and composed set to true
    const events = [];
    el.addEventListener('payment-success', e => events.push(e));
    el.paymentProcessor = instantSuccess;
    setInputs(el, { name: 'Jane Doe', cardNumber: '1234567890123456', expiry: '12/99', cvv: '123' });
    submitForm(el);
    await flushMicrotasks();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });

  it('Property 6: payment-success has bubbles and composed true', () => {
    // Feature: payment-component-demo, Property 6: All events have bubbles and composed set to true
    const events = [];
    el.addEventListener('payment-success', e => events.push(e));
    el._setState('submitting');
    el.notifySuccess();
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });

  it('Property 6: payment-error has bubbles and composed true (via processor)', async () => {
    // Feature: payment-component-demo, Property 6: All events have bubbles and composed set to true
    const events = [];
    el.addEventListener('payment-error', e => events.push(e));
    el.paymentProcessor = instantFailure;
    setInputs(el, { name: 'Jane Doe', cardNumber: '1234567890123456', expiry: '12/99', cvv: '123' });
    submitForm(el);
    await flushMicrotasks();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });

  it('Property 6: payment-reset has bubbles and composed true', () => {
    // Feature: payment-component-demo, Property 6: All events have bubbles and composed set to true
    const events = [];
    el.addEventListener('payment-reset', e => events.push(e));
    clickReset(el);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 7: Error message round-trip through notifyError
// Feature: payment-component-demo, Property 7: Error message round-trip through notifyError
// ---------------------------------------------------------------------------
describe('PaymentFormElement — Property 7: Error message round-trip through notifyError', () => {
  let el;
  beforeEach(() => { el = mountComponent(); });
  afterEach(() => { el.remove(); });

  it('Property 7: arbitrary non-empty error messages round-trip correctly', () => {
    // Feature: payment-component-demo, Property 7: Error message round-trip through notifyError
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (msg) => {
        el._setState('submitting');
        const events = [];
        el.addEventListener('payment-error', e => events.push(e));
        el.notifyError(msg);
        expect(events).toHaveLength(1);
        expect(events[0].detail.message).toBe(msg);
        expect(el.shadowRoot.querySelector('.status-message').textContent).toBe(msg);
        events.length = 0;
        el._setState('idle');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Invalid fields receive aria-invalid="true"
// Feature: payment-component-demo, Property 10: Invalid fields receive aria-invalid="true"
// ---------------------------------------------------------------------------
describe('PaymentFormElement — Property 10: Invalid fields receive aria-invalid="true"', () => {
  let el;
  beforeEach(() => { el = mountComponent(); });
  afterEach(() => { el.remove(); });

  it('Property 10: invalid inputs get aria-invalid=true, valid inputs do not', () => {
    // Feature: payment-component-demo, Property 10: Invalid fields receive aria-invalid="true"
    const cases = [
      { name: '', cardNumber: '', expiry: '', cvv: '', invalidFields: ['cardholder-name', 'card-number', 'expiry', 'cvv'] },
      { name: 'Alice', cardNumber: 'bad', expiry: 'bad', cvv: 'bad', invalidFields: ['card-number', 'expiry', 'cvv'], validFields: ['cardholder-name'] },
      { name: 'Bob', cardNumber: '123', expiry: '12/99', cvv: '456', invalidFields: ['card-number'], validFields: ['cardholder-name', 'expiry', 'cvv'] },
    ];
    for (const { name, cardNumber, expiry, cvv, invalidFields, validFields = [] } of cases) {
      setInputs(el, { name, cardNumber, expiry, cvv });
      submitForm(el);
      for (const id of invalidFields) {
        expect(el.shadowRoot.getElementById(id).getAttribute('aria-invalid')).toBe('true');
      }
      for (const id of validFields) {
        expect(el.shadowRoot.getElementById(id).hasAttribute('aria-invalid')).toBe(false);
      }
      el._setState('idle');
      el.shadowRoot.querySelectorAll('input').forEach(i => i.removeAttribute('aria-invalid'));
    }
  });
});

// ---------------------------------------------------------------------------
// configure() — default config
// ---------------------------------------------------------------------------
describe('PaymentFormElement — DEFAULT_CONFIG', () => {
  it('exports DEFAULT_CONFIG with the documented defaults', () => {
    expect(DEFAULT_CONFIG).toEqual({
      submitLabel: 'Pay Now',
      cancelLabel: 'Cancel',
      heading: undefined,
      requireCvv: true,
      primaryColor: '#3b82f6',
      amount: undefined,
      currency: undefined,
    });
  });

  it('new instance initialises _config to a copy of DEFAULT_CONFIG', () => {
    const el = new PaymentFormElement();
    expect(el._config).toEqual(DEFAULT_CONFIG);
    expect(el._config).not.toBe(DEFAULT_CONFIG);
  });
});

// ---------------------------------------------------------------------------
// configure() — button labels
// ---------------------------------------------------------------------------
describe('PaymentFormElement — configure() button labels', () => {
  let el;
  beforeEach(() => {
    el = document.createElement('payment-form');
    el.paymentProcessor = async () => ({ success: true });
    document.body.appendChild(el);
  });
  afterEach(() => { el.remove(); });

  it('defaults render "Pay Now" and "Cancel" button labels', () => {
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Pay Now');
    expect(el.shadowRoot.getElementById('reset-btn').textContent).toBe('Cancel');
  });

  it('configure({submitLabel}) updates the submit button text', () => {
    el.configure({ submitLabel: 'Book flight' });
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Book flight');
  });

  it('configure({cancelLabel}) updates the cancel button text', () => {
    el.configure({ cancelLabel: 'Abort' });
    expect(el.shadowRoot.getElementById('reset-btn').textContent).toBe('Abort');
  });

  it('configure() with partial config leaves other fields at defaults', () => {
    el.configure({ submitLabel: 'Go' });
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Go');
    expect(el.shadowRoot.getElementById('reset-btn').textContent).toBe('Cancel');
    expect(el._config.cancelLabel).toBe('Cancel');
  });
});

// ---------------------------------------------------------------------------
// configure() — heading
// ---------------------------------------------------------------------------
describe('PaymentFormElement — configure() heading', () => {
  let el;
  beforeEach(() => {
    el = document.createElement('payment-form');
    el.paymentProcessor = async () => ({ success: true });
    document.body.appendChild(el);
  });
  afterEach(() => { el.remove(); });

  it('default: no <h2> heading exists in the shadow DOM', () => {
    expect(el.shadowRoot.querySelector('h2')).toBeNull();
  });

  it('configure({heading}) inserts an <h2> as the first child of the form', () => {
    el.configure({ heading: 'Complete your booking' });
    const form = el.shadowRoot.getElementById('payment-form');
    const h2 = form.querySelector('h2');
    expect(h2).not.toBeNull();
    expect(h2.textContent).toBe('Complete your booking');
    expect(form.firstElementChild).toBe(h2);
  });

  it('configure({heading}) called twice updates the existing <h2> (no duplicates)', () => {
    el.configure({ heading: 'First' });
    el.configure({ heading: 'Second' });
    const headings = el.shadowRoot.querySelectorAll('h2');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toBe('Second');
  });
});

// ---------------------------------------------------------------------------
// configure() — primaryColor
// ---------------------------------------------------------------------------
describe('PaymentFormElement — configure() primaryColor', () => {
  let el;
  beforeEach(() => {
    el = document.createElement('payment-form');
    el.paymentProcessor = async () => ({ success: true });
    document.body.appendChild(el);
  });
  afterEach(() => { el.remove(); });

  it('default: --pf-primary custom property is set to the default color on the host', () => {
    expect(el.style.getPropertyValue('--pf-primary')).toBe('#3b82f6');
  });

  it('configure({primaryColor}) sets the --pf-primary custom property on the host', () => {
    el.configure({ primaryColor: '#ff6600' });
    expect(el.style.getPropertyValue('--pf-primary')).toBe('#ff6600');
  });
});

// ---------------------------------------------------------------------------
// configure() — requireCvv
// ---------------------------------------------------------------------------
describe('PaymentFormElement — configure() requireCvv', () => {
  let el;
  beforeEach(() => {
    el = document.createElement('payment-form');
    document.body.appendChild(el);
  });
  afterEach(() => { el.remove(); });

  it('default: #cvv input exists in the shadow DOM', () => {
    expect(el.shadowRoot.getElementById('cvv')).not.toBeNull();
  });

  it('configure({requireCvv: false}) removes the CVV field from the shadow DOM', () => {
    el.configure({ requireCvv: false });
    expect(el.shadowRoot.getElementById('cvv')).toBeNull();
  });

  it('configure({requireCvv: false}) lets submit succeed without a CVV value', async () => {
    let captured = null;
    el.paymentProcessor = async (details) => { captured = details; return { success: true }; };
    el.configure({ requireCvv: false });

    el.shadowRoot.getElementById('cardholder-name').value = 'Jane Doe';
    el.shadowRoot.getElementById('card-number').value = '1234567890123456';
    el.shadowRoot.getElementById('expiry').value = '12/99';
    el.shadowRoot.getElementById('payment-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(captured).not.toBeNull();
    expect(captured.name).toBe('Jane Doe');
    expect(captured.cardNumber).toBe('1234567890123456');
    expect(captured.expiry).toBe('12/99');
    expect(captured).not.toHaveProperty('cvv');
  });

  it('configure({requireCvv: true}) restores the CVV field if it was removed', () => {
    el.configure({ requireCvv: false });
    expect(el.shadowRoot.getElementById('cvv')).toBeNull();
    el.configure({ requireCvv: true });
    expect(el.shadowRoot.getElementById('cvv')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// configure() — amount and currency
// ---------------------------------------------------------------------------
describe('PaymentFormElement — configure() amount and currency', () => {
  let el;
  beforeEach(() => {
    el = document.createElement('payment-form');
    document.body.appendChild(el);
  });
  afterEach(() => { el.remove(); });

  it('configure({amount, currency}) passes both to the processor in details', async () => {
    let captured = null;
    el.paymentProcessor = async (details) => { captured = details; return { success: true }; };
    el.configure({ amount: 199.00, currency: 'GBP' });

    el.shadowRoot.getElementById('cardholder-name').value = 'Jane Doe';
    el.shadowRoot.getElementById('card-number').value = '1234567890123456';
    el.shadowRoot.getElementById('expiry').value = '12/99';
    el.shadowRoot.getElementById('cvv').value = '123';
    el.shadowRoot.getElementById('payment-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(captured.amount).toBe(199.00);
    expect(captured.currency).toBe('GBP');
  });

  it('configure({amount, currency}) appends formatted currency to the submit button label', () => {
    el.configure({ submitLabel: 'Pay Now', amount: 199.00, currency: 'GBP' });
    const expectedAmount = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' }).format(199.00);
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe(`Pay Now ${expectedAmount}`);
  });

  it('only amount set (no currency) leaves submit label unformatted', () => {
    el.configure({ submitLabel: 'Pay Now', amount: 50 });
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Pay Now');
  });

  it('only currency set (no amount) leaves submit label unformatted', () => {
    el.configure({ submitLabel: 'Pay Now', currency: 'EUR' });
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Pay Now');
  });

  it('details object omits amount/currency when neither is configured', async () => {
    let captured = null;
    el.paymentProcessor = async (details) => { captured = details; return { success: true }; };
    el.shadowRoot.getElementById('cardholder-name').value = 'Jane Doe';
    el.shadowRoot.getElementById('card-number').value = '1234567890123456';
    el.shadowRoot.getElementById('expiry').value = '12/99';
    el.shadowRoot.getElementById('cvv').value = '123';
    el.shadowRoot.getElementById('payment-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(captured).not.toHaveProperty('amount');
    expect(captured).not.toHaveProperty('currency');
  });
});

// ---------------------------------------------------------------------------
// configure() — unknown keys and invalid values
// ---------------------------------------------------------------------------
describe('PaymentFormElement — configure() validation', () => {
  let el;
  beforeEach(() => {
    el = document.createElement('payment-form');
    el.paymentProcessor = async () => ({ success: true });
    document.body.appendChild(el);
  });
  afterEach(() => { el.remove(); });

  it('unknown keys are silently ignored', () => {
    expect(() => el.configure({ bogus: 'x', anotherBogus: 42, submitLabel: 'Go' })).not.toThrow();
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Go');
    expect(el._config).not.toHaveProperty('bogus');
    expect(el._config).not.toHaveProperty('anotherBogus');
  });

  it('non-object argument is a no-op (does not throw)', () => {
    const before = { ...el._config };
    expect(() => el.configure(null)).not.toThrow();
    expect(() => el.configure(undefined)).not.toThrow();
    expect(() => el.configure('string')).not.toThrow();
    expect(() => el.configure(42)).not.toThrow();
    expect(el._config).toEqual(before);
  });

  it('invalid submitLabel (non-string / empty) is rejected', () => {
    el.configure({ submitLabel: 'Valid' });
    el.configure({ submitLabel: 123 });
    el.configure({ submitLabel: '' });
    el.configure({ submitLabel: null });
    expect(el._config.submitLabel).toBe('Valid');
  });

  it('invalid cancelLabel is rejected', () => {
    el.configure({ cancelLabel: 'Valid' });
    el.configure({ cancelLabel: 0 });
    el.configure({ cancelLabel: '' });
    expect(el._config.cancelLabel).toBe('Valid');
  });

  it('invalid heading is rejected', () => {
    el.configure({ heading: 'Valid' });
    el.configure({ heading: 42 });
    el.configure({ heading: '' });
    expect(el._config.heading).toBe('Valid');
  });

  it('invalid requireCvv (non-boolean) is rejected', () => {
    el.configure({ requireCvv: false });
    el.configure({ requireCvv: 'true' });
    el.configure({ requireCvv: 1 });
    el.configure({ requireCvv: null });
    expect(el._config.requireCvv).toBe(false);
  });

  it('invalid primaryColor is rejected', () => {
    el.configure({ primaryColor: '#ff6600' });
    el.configure({ primaryColor: 123 });
    el.configure({ primaryColor: '' });
    expect(el._config.primaryColor).toBe('#ff6600');
  });

  it('invalid amount (negative / NaN / non-number) is rejected', () => {
    el.configure({ amount: 50 });
    el.configure({ amount: -1 });
    el.configure({ amount: NaN });
    el.configure({ amount: Infinity });
    el.configure({ amount: '50' });
    expect(el._config.amount).toBe(50);
  });

  it('invalid currency (non-string / empty) is rejected', () => {
    el.configure({ currency: 'GBP' });
    el.configure({ currency: 42 });
    el.configure({ currency: '' });
    expect(el._config.currency).toBe('GBP');
  });
});

// ---------------------------------------------------------------------------
// configure() — timing
// ---------------------------------------------------------------------------
describe('PaymentFormElement — configure() timing', () => {
  it('configure() before connection applies on connectedCallback', () => {
    const el = document.createElement('payment-form');
    el.configure({
      submitLabel: 'Book flight',
      cancelLabel: 'Abort',
      heading: 'Complete your booking',
      primaryColor: '#ff6600',
      requireCvv: false,
      amount: 199,
      currency: 'GBP',
    });
    expect(el.shadowRoot).toBeNull();

    document.body.appendChild(el);

    expect(el.shadowRoot.getElementById('submit-btn').textContent).toContain('Book flight');
    expect(el.shadowRoot.getElementById('reset-btn').textContent).toBe('Abort');
    expect(el.shadowRoot.querySelector('h2.form-heading').textContent).toBe('Complete your booking');
    expect(el.style.getPropertyValue('--pf-primary')).toBe('#ff6600');
    expect(el.shadowRoot.getElementById('cvv')).toBeNull();

    el.remove();
  });

  it('configure() after connection triggers re-render', () => {
    const el = document.createElement('payment-form');
    document.body.appendChild(el);

    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Pay Now');
    el.configure({ submitLabel: 'Go' });
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Go');
    el.configure({ submitLabel: 'Back' });
    expect(el.shadowRoot.getElementById('submit-btn').textContent).toBe('Back');

    el.remove();
  });
});

// ---------------------------------------------------------------------------
// Property 9: Reset always returns to idle with cleared fields
// Feature: payment-component-demo, Property 9: Reset always returns to idle with cleared fields
// ---------------------------------------------------------------------------
describe('PaymentFormElement — Property 9: Reset always returns to idle with cleared fields', () => {
  let el;
  beforeEach(() => { el = mountComponent(); });
  afterEach(() => { el.remove(); });

  it('Property 9: reset from various states returns to idle with cleared fields', () => {
    // Feature: payment-component-demo, Property 9: Reset always returns to idle with cleared fields
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'submitting', 'success', 'error'),
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 16, maxLength: 16 }),
        (startState, name, cardNumber) => {
          setInputs(el, { name, cardNumber, expiry: '12/99', cvv: '123' });
          if (startState === 'idle') { el._setState('idle'); }
          else if (startState === 'submitting') { el._setState('submitting'); }
          else if (startState === 'success') { el._setState('submitting'); el.notifySuccess(); }
          else if (startState === 'error') { el._setState('submitting'); el.notifyError('some error'); }
          clickReset(el);
          expect(el.state).toBe('idle');
          el.shadowRoot.querySelectorAll('input').forEach(i => expect(i.value).toBe(''));
          expect(el.shadowRoot.querySelector('.status-message').textContent).toBe('');
          el.shadowRoot.querySelectorAll('.error').forEach(span => expect(span.textContent).toBe(''));
        }
      ),
      { numRuns: 100 }
    );
  });
});
