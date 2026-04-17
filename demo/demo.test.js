// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { appendLogEntry, initDemo } from './demo.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLogEl() {
  const div = document.createElement('div');
  div.id = 'event-log';
  document.body.appendChild(div);
  return div;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function futureMmYy() {
  const now = new Date();
  const currentYear2 = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  return fc.integer({ min: 1, max: 132 }).map((offset) => {
    let month = currentMonth + offset;
    let year = currentYear2;
    year += Math.floor((month - 1) / 12);
    month = ((month - 1) % 12) + 1;
    year = year % 100;
    return `${pad2(month)}/${pad2(year)}`;
  });
}

// ---------------------------------------------------------------------------
// Property 11: Demo page log captures submitted payment details
// Feature: payment-component-demo, Property 11: Demo page log captures submitted payment details
// ---------------------------------------------------------------------------
describe('appendLogEntry — Property 11: Demo page log captures submitted payment details', () => {
  let logEl;
  beforeEach(() => { logEl = makeLogEl(); });

  it('Property 11: log entry contains name, cardNumber, and expiry from submitted details', () => {
    // Feature: payment-component-demo, Property 11: Demo page log captures submitted payment details
    const validName = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);
    const validCard = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 16, maxLength: 16 });

    fc.assert(
      fc.property(validName, validCard, futureMmYy(), (name, cardNumber, expiry) => {
        logEl.innerHTML = '';
        const detail = { name, cardNumber, expiry };
        appendLogEntry(logEl, 'submit', detail);
        const entries = logEl.querySelectorAll('.log-entry');
        expect(entries.length).toBeGreaterThan(0);
        const lastEntry = entries[entries.length - 1];
        expect(lastEntry.textContent).toContain(JSON.stringify(detail));
      }),
      { numRuns: 100 }
    );
  });

  it('Property 11: removes .log-empty placeholder before appending entry', () => {
    // Feature: payment-component-demo, Property 11: Demo page log captures submitted payment details
    const placeholder = document.createElement('p');
    placeholder.className = 'log-empty';
    placeholder.textContent = 'No events yet.';
    logEl.appendChild(placeholder);
    appendLogEntry(logEl, 'submit', { name: 'Alice', cardNumber: '1234567890123456', expiry: '12/99' });
    expect(logEl.querySelector('.log-empty')).toBeNull();
    expect(logEl.querySelectorAll('.log-entry').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Property 12: Demo page error log captures error messages
// Feature: payment-component-demo, Property 12: Demo page error log captures error messages
// ---------------------------------------------------------------------------
describe('appendLogEntry — Property 12: Demo page error log captures error messages', () => {
  let logEl;
  beforeEach(() => { logEl = makeLogEl(); });

  it('Property 12: arbitrary non-empty error messages appear in the log entry', () => {
    // Feature: payment-component-demo, Property 12: Demo page error log captures error messages
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (msg) => {
        logEl.innerHTML = '';
        appendLogEntry(logEl, 'error', { message: msg });
        const entries = logEl.querySelectorAll('.log-entry.log-error');
        expect(entries.length).toBeGreaterThan(0);
        const lastEntry = entries[entries.length - 1];
        expect(lastEntry.textContent).toContain(JSON.stringify({ message: msg }));
      }),
      { numRuns: 100 }
    );
  });

  it('Property 12: log entry has correct CSS class for error type', () => {
    // Feature: payment-component-demo, Property 12: Demo page error log captures error messages
    appendLogEntry(logEl, 'error', { message: 'Payment declined.' });
    const entry = logEl.querySelector('.log-entry');
    expect(entry.classList.contains('log-error')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// initDemo — configure() wiring
// ---------------------------------------------------------------------------
describe('initDemo — configures the payment form', () => {
  let formEl, logEl, toggleEl, payInFullBtn, payDepositBtn, calls;

  beforeEach(() => {
    calls = [];
    formEl = {
      configure: (cfg) => calls.push(cfg),
      addEventListener: () => {},
      paymentProcessor: null,
    };
    logEl = document.createElement('div');
    toggleEl = document.createElement('input');
    toggleEl.type = 'checkbox';
    toggleEl.checked = true;
    payInFullBtn = document.createElement('button');
    payDepositBtn = document.createElement('button');
  });

  it('calls formEl.configure once on init with the expected demo config', () => {
    initDemo(formEl, logEl, toggleEl, payInFullBtn, payDepositBtn);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      heading: 'Complete your holiday',
      submitLabel: 'Pay for holiday',
      cancelLabel: 'Cancel',
      primaryColor: '#ff6600',
      amount: 3599.00,
      currency: 'GBP',
      requireCvv: true,
    });
  });

  it('clicking pay-in-full button calls formEl.configure({ amount: 3599 })', () => {
    initDemo(formEl, logEl, toggleEl, payInFullBtn, payDepositBtn);
    payInFullBtn.click();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ amount: 3599 });
  });

  it('clicking pay-deposit button calls formEl.configure({ amount: 120 })', () => {
    initDemo(formEl, logEl, toggleEl, payInFullBtn, payDepositBtn);
    payDepositBtn.click();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ amount: 120 });
  });
});
