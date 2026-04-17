// payment-form.js — Payment Web Component + Validator Module

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/**
 * Built-in defaults for the <payment-form> configure() method.
 * Host pages may override any subset of these via formEl.configure({ ... }).
 */
export const DEFAULT_CONFIG = {
  submitLabel: 'Pay Now',
  cancelLabel: 'Cancel',
  heading: undefined,
  requireCvv: true,
  primaryColor: '#3b82f6',
  amount: undefined,
  currency: undefined,
};

// ---------------------------------------------------------------------------
// Validator functions (pure, exported for testing)
// ---------------------------------------------------------------------------

/**
 * Validates cardholder name: must be non-empty and non-whitespace.
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateName(value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return { valid: true, error: '' };
  }
  return { valid: false, error: 'Cardholder name is required.' };
}

/**
 * Validates card number: must be exactly 16 numeric digits.
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateCardNumber(value) {
  if (typeof value === 'string' && /^\d{16}$/.test(value)) {
    return { valid: true, error: '' };
  }
  return { valid: false, error: 'Card number must be 16 digits.' };
}

/**
 * Validates expiry date: must match MM/YY format and represent a future date.
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateExpiry(value) {
  const INVALID = { valid: false, error: 'Expiry must be a future date in MM/YY format.' };
  if (typeof value !== 'string' || !/^\d{2}\/\d{2}$/.test(value)) return INVALID;

  const [mm, yy] = value.split('/').map(Number);
  if (mm < 1 || mm > 12) return INVALID;

  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (yy > currentYear || (yy === currentYear && mm > currentMonth)) {
    return { valid: true, error: '' };
  }
  return INVALID;
}

/**
 * Validates CVV: must be exactly 3 numeric digits.
 * @param {string} value
 * @returns {{ valid: boolean, error: string }}
 */
export function validateCVV(value) {
  if (typeof value === 'string' && /^\d{3}$/.test(value)) {
    return { valid: true, error: '' };
  }
  return { valid: false, error: 'CVV must be 3 digits.' };
}

// ---------------------------------------------------------------------------
// PaymentFormElement — Custom Element
// ---------------------------------------------------------------------------

const FORM_HTML = `
<style>
*, *::before, *::after { box-sizing: border-box; }

form {
  font-family: system-ui, sans-serif;
  max-width: 400px;
  padding: 1.5rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.form-heading {
  margin: 0 0 1rem 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #111827;
}

.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #374151;
}

input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.15s;
}

input:focus {
  outline: 2px solid var(--pf-primary, #3b82f6);
  outline-offset: 1px;
  border-color: var(--pf-primary, #3b82f6);
}

input[aria-invalid="true"] {
  border-color: #ef4444;
}

.error {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
  min-height: 1em;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

button {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

#submit-btn {
  background: var(--pf-primary, #3b82f6);
  color: #fff;
  flex: 1;
}

#submit-btn:hover:not(:disabled) {
  background: #2563eb;
}

#submit-btn:disabled,
#submit-btn[aria-busy="true"] {
  opacity: 0.6;
  cursor: not-allowed;
}

#reset-btn {
  background: #f3f4f6;
  color: #374151;
}

#reset-btn:hover {
  background: #e5e7eb;
}

.status-message {
  margin-top: 1rem;
  font-size: 0.9rem;
  min-height: 1.5em;
  color: #374151;
}
</style>
<form id="payment-form">
  <div class="field">
    <label for="cardholder-name">Cardholder Name</label>
    <input id="cardholder-name" type="text" autocomplete="cc-name" />
    <span class="error" role="alert"></span>
  </div>
  <div class="field">
    <label for="card-number">Card Number</label>
    <input id="card-number" type="text" inputmode="numeric" maxlength="16" autocomplete="cc-number" />
    <span class="error" role="alert"></span>
  </div>
  <div class="field">
    <label for="expiry">Expiry Date (MM/YY)</label>
    <input id="expiry" type="text" inputmode="numeric" maxlength="5" autocomplete="cc-exp" />
    <span class="error" role="alert"></span>
  </div>
  <div class="field">
    <label for="cvv">CVV</label>
    <input id="cvv" type="password" inputmode="numeric" maxlength="3" autocomplete="cc-csc" />
    <span class="error" role="alert"></span>
  </div>
  <div class="actions">
    <button type="submit" id="submit-btn">Pay Now</button>
    <button type="button" id="reset-btn">Cancel</button>
  </div>
  <div class="status-message" aria-live="polite"></div>
</form>
`;

// ---------------------------------------------------------------------------
// Default simulated payment processor
// ---------------------------------------------------------------------------

/**
 * Simulates a bank payment call. Resolves after a delay.
 * In production, replace this with a real API call.
 * @param {object} details - { name, cardNumber, expiry, cvv }
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function simulatedPaymentProcessor(details) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 2000);
  });
}

// ---------------------------------------------------------------------------
// PaymentFormElement
// ---------------------------------------------------------------------------

export class PaymentFormElement extends HTMLElement {
  constructor() {
    super();
    this._state = 'idle';
    this._config = { ...DEFAULT_CONFIG };
    /**
     * Injectable payment processor function.
     * Must accept a details object and return a Promise that resolves to
     * { success: boolean, message?: string }.
     *
     * Set this property to swap in a real payment gateway:
     *   document.querySelector('payment-form').paymentProcessor = myGateway;
     */
    this.paymentProcessor = simulatedPaymentProcessor;
  }

  get state() {
    return this._state;
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = FORM_HTML;

    shadow.getElementById('payment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleSubmit();
    });

    shadow.getElementById('reset-btn').addEventListener('click', () => {
      this._handleReset();
    });

    this._renderFromConfig();
  }

  /**
   * Merge a partial config onto the current config. Unknown keys and
   * invalid values are ignored. Safe to call before or after connectedCallback.
   */
  configure(partial) {
    if (partial == null || typeof partial !== 'object') return;
    const validated = {};
    if (typeof partial.submitLabel === 'string' && partial.submitLabel.length > 0) {
      validated.submitLabel = partial.submitLabel;
    }
    if (typeof partial.cancelLabel === 'string' && partial.cancelLabel.length > 0) {
      validated.cancelLabel = partial.cancelLabel;
    }
    if (typeof partial.heading === 'string' && partial.heading.length > 0) {
      validated.heading = partial.heading;
    }
    if (typeof partial.primaryColor === 'string' && partial.primaryColor.length > 0) {
      validated.primaryColor = partial.primaryColor;
    }
    if (typeof partial.requireCvv === 'boolean') {
      validated.requireCvv = partial.requireCvv;
    }
    if (typeof partial.amount === 'number' && Number.isFinite(partial.amount) && partial.amount >= 0) {
      validated.amount = partial.amount;
    }
    if (typeof partial.currency === 'string' && partial.currency.length > 0) {
      validated.currency = partial.currency;
    }
    Object.assign(this._config, validated);
    if (this.shadowRoot) this._renderFromConfig();
  }

  _renderFromConfig() {
    const submitBtn = this.shadowRoot.getElementById('submit-btn');
    const resetBtn = this.shadowRoot.getElementById('reset-btn');
    if (submitBtn) {
      const { submitLabel, amount, currency } = this._config;
      if (typeof amount === 'number' && typeof currency === 'string') {
        const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
        submitBtn.textContent = `${submitLabel} ${formatted}`;
      } else {
        submitBtn.textContent = submitLabel;
      }
    }
    if (resetBtn) resetBtn.textContent = this._config.cancelLabel;

    const form = this.shadowRoot.getElementById('payment-form');
    let heading = form.querySelector('h2.form-heading');
    if (this._config.heading) {
      if (!heading) {
        heading = document.createElement('h2');
        heading.className = 'form-heading';
        form.insertBefore(heading, form.firstElementChild);
      }
      heading.textContent = this._config.heading;
    } else if (heading) {
      heading.remove();
    }

    const cvvInput = this.shadowRoot.getElementById('cvv');
    const cvvField = cvvInput ? cvvInput.closest('.field') : this._detachedCvvField;
    if (this._config.requireCvv) {
      if (cvvField && !cvvField.isConnected) {
        const actions = this.shadowRoot.querySelector('.actions');
        this.shadowRoot.getElementById('payment-form').insertBefore(cvvField, actions);
        this._detachedCvvField = null;
      }
    } else {
      if (cvvField && cvvField.isConnected) {
        this._detachedCvvField = cvvField;
        cvvField.remove();
      }
    }

    this.style.setProperty('--pf-primary', this._config.primaryColor);
  }

  async _handleSubmit() {
    const shadow = this.shadowRoot;
    const nameInput = shadow.getElementById('cardholder-name');
    const cardInput = shadow.getElementById('card-number');
    const expiryInput = shadow.getElementById('expiry');
    const cvvInput = this._config.requireCvv ? shadow.getElementById('cvv') : null;

    const fields = [
      { input: nameInput,   result: validateName(nameInput.value) },
      { input: cardInput,   result: validateCardNumber(cardInput.value) },
      { input: expiryInput, result: validateExpiry(expiryInput.value) },
    ];
    if (cvvInput) {
      fields.push({ input: cvvInput, result: validateCVV(cvvInput.value) });
    }

    let allValid = true;
    for (const { input, result } of fields) {
      const errorSpan = input.nextElementSibling;
      if (!result.valid) {
        input.setAttribute('aria-invalid', 'true');
        if (errorSpan) errorSpan.textContent = result.error;
        allValid = false;
      } else {
        input.removeAttribute('aria-invalid');
        if (errorSpan) errorSpan.textContent = '';
      }
    }

    if (!allValid) return;

    // Transition to submitting — the component now owns the entire flow
    this._setState('submitting');

    const details = {
      name: nameInput.value,
      cardNumber: cardInput.value,
      expiry: expiryInput.value,
    };
    if (cvvInput) details.cvv = cvvInput.value;
    if (typeof this._config.amount === 'number') details.amount = this._config.amount;
    if (typeof this._config.currency === 'string') details.currency = this._config.currency;

    try {
      const result = await this.paymentProcessor(details);

      // Guard: user may have reset while we were waiting
      if (this._state !== 'submitting') return;

      if (result && result.success) {
        this._notifySuccess();
      } else {
        const msg = (result && typeof result.message === 'string' && result.message.length > 0)
          ? result.message
          : 'Payment failed. Please try again.';
        this._notifyError(msg);
      }
    } catch (err) {
      if (this._state !== 'submitting') return;
      const msg = (err && typeof err.message === 'string' && err.message.length > 0)
        ? err.message
        : 'Payment failed. Please try again.';
      this._notifyError(msg);
    }
  }

  _handleReset() {
    this.dispatchEvent(new CustomEvent('payment-reset', { bubbles: true, composed: true }));
    this._setState('idle');
  }

  _el(id) { return this.shadowRoot.getElementById(id); }
  _inputs() { return this.shadowRoot.querySelectorAll('input'); }
  _fields() { return this.shadowRoot.querySelectorAll('.field'); }
  _statusDiv() { return this.shadowRoot.querySelector('.status-message'); }

  _setState(newState, errorMessage) {
    this._state = newState;
    this._render(errorMessage);
  }

  _render(errorMessage) {
    const submitBtn = this._el('submit-btn');
    const inputs = this._inputs();
    const fields = this._fields();
    const status = this._statusDiv();

    switch (this._state) {
      case 'submitting':
        inputs.forEach(i => { i.disabled = true; });
        if (submitBtn) { submitBtn.disabled = true; submitBtn.setAttribute('aria-busy', 'true'); }
        if (status) status.textContent = 'Processing...';
        break;
      case 'success':
        fields.forEach(f => { f.style.display = 'none'; });
        if (status) status.textContent = 'Payment successful!';
        break;
      case 'error':
        inputs.forEach(i => { i.disabled = false; });
        if (submitBtn) submitBtn.disabled = false;
        if (status) status.textContent = errorMessage || '';
        break;
      case 'idle':
      default:
        inputs.forEach(i => { i.disabled = false; i.value = ''; });
        if (submitBtn) { submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); }
        fields.forEach(f => { f.style.display = ''; });
        if (status) status.textContent = '';
        break;
    }
  }

  // ── Internal outcome handlers (called after processor resolves) ──────────

  _notifySuccess() {
    if (this._state !== 'submitting') return;
    this.dispatchEvent(new CustomEvent('payment-success', { bubbles: true, composed: true }));
    this._setState('success');
  }

  _notifyError(message) {
    if (this._state !== 'submitting') return;
    const resolved = (typeof message === 'string' && message.length > 0)
      ? message
      : 'Payment failed. Please try again.';
    this.dispatchEvent(new CustomEvent('payment-error', {
      bubbles: true,
      composed: true,
      detail: { message: resolved },
    }));
    this._setState('error', resolved);
  }

  // ── Legacy public API (kept for backward compat, delegates internally) ───

  notifySuccess() { this._notifySuccess(); }
  notifyError(message) { this._notifyError(message); }
}

customElements.define('payment-form', PaymentFormElement);
