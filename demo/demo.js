// Demo page — the host page knows nothing about how payment works.
// It just listens for outcome events and logs them.




/**
 * Appends a timestamped log entry to the log panel.
 */
export function appendLogEntry(logEl, type, detail = null) {
  const placeholder = logEl.querySelector('.log-empty');
  if (placeholder) placeholder.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  const timestamp = new Date().toISOString();
  const detailStr = detail !== null ? JSON.stringify(detail) : '(no detail)';
  entry.textContent = `[${timestamp}] ${type}: ${detailStr}`;
  logEl.appendChild(entry);

  console.log(`[EventLog] ${type}:`, detail ?? '(no detail)');
}



/**
 * Creates a simulated payment processor whose outcome is controlled
 * by the toggle checkbox. This is injected into the component so the
 * demo can switch between success and failure scenarios.
 */
function createDemoProcessor(toggleEl) {
  return async (_details) => {
    console.log('[DemoProcessor] Component called the payment processor — sending details to the bank...');
    console.log('[DemoProcessor] Payment details received:', {
      name: _details.name,
      cardNumber: _details.cardNumber,
      expiry: _details.expiry,
      cvv: _details.cvv === undefined ? '(not required)' : '***',
      amount: _details.amount,
      currency: _details.currency,
    });

    // Simulate bank processing delay
    console.log('[DemoProcessor] Waiting 2 seconds for bank response...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (toggleEl.checked) {
      console.log('[DemoProcessor] Bank responded: APPROVED');
      return { success: true };
    }

    console.log('[DemoProcessor] Bank responded: DECLINED');
    return { success: false, message: 'Payment declined. Please try again.' };
  };
}




/**
 * Wires up the demo page. The host page only reacts to events —
 * it never touches payment internals.
 */
export function initDemo(formEl, logEl, toggleEl, payInFullBtn, payDepositBtn) {
  console.log('[Demo] Initialising demo page — configuring and injecting payment processor into <payment-form>');

  // Configure the component for this demo (branding, labels, transaction context)
  const config = {
    heading: 'Pay for your holiday',
    submitLabel: 'Pay in full',
    cancelLabel: 'Cancel',
    primaryColor: '#ff6600',
    amount: 3599.00,
    currency: 'GBP',
    requireCvv: true,
  };

  formEl.configure(config);
  console.log('[Demo] Configured <payment-form> with:', config);

  payInFullBtn.addEventListener('click', () => {
    console.log('[Demo] "Pay in full" clicked — reconfiguring amount to 3599');
    formEl.configure({ amount: 3599, submitLabel: "Pay in full" });
  });
  payDepositBtn.addEventListener('click', () => {
    console.log('[Demo] "Pay deposit" clicked — reconfiguring amount to 120');
    formEl.configure({ amount: 120, submitLabel: "Pay deposit" });
  });

  // Inject the demo processor into the component
  formEl.paymentProcessor = createDemoProcessor(toggleEl);
  console.log('[Demo] Payment processor injected. The host page will now only listen for outcome events.');

  // Just log outcomes — the host page is completely decoupled
  formEl.addEventListener('payment-success', () => {
    console.log('[Demo] Received "payment-success" event from component — payment was successful');
    appendLogEntry(logEl, 'success', null);
  });

  formEl.addEventListener('payment-error', (event) => {
    console.log('[Demo] Received "payment-error" event from component —', event.detail.message);
    appendLogEntry(logEl, 'error', event.detail);
  });

  formEl.addEventListener('payment-reset', () => {
    console.log('[Demo] Received "payment-reset" event from component — form was reset by user');
    appendLogEntry(logEl, 'reset', null);
  });

  console.log('[Demo] Event listeners attached. Ready for user interaction.');
}




// ENTRY POINT /////////////////////////////////////////////////////////////
// Auto-init when running in browser
if (typeof document !== 'undefined' && document.readyState !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Demo] DOMContentLoaded — looking for <payment-form>, event log, toggle, and amount option buttons...');
    const form = document.getElementById('payment-form-demo');
    const log = document.getElementById('event-log');
    const toggle = document.getElementById('simulate-success');
    const payInFull = document.getElementById('pay-in-full-btn');
    const payDeposit = document.getElementById('pay-deposit-btn');
    if (form && log && toggle && payInFull && payDeposit) {
      console.log('[Demo] All elements found. Starting init.');
      initDemo(form, log, toggle, payInFull, payDeposit);
    } else {
      console.warn('[Demo] Could not find required elements — demo will not initialise.');
    }
  });
}
