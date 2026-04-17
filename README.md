# Payment Component Demo

This is an **example project** showing how a web component could be used to host payment-related UI at easyJet. It is not a production payment component and does not talk to a real gateway.

## The idea

A single custom element — `<payment-form>` — owns card entry, validation, and (notionally) gateway communication behind a shadow DOM boundary. The host page never touches card details. It only:

- configures the component (labels, amount, currency, theme, which fields to show), and
- reacts to three outcome events that bubble out of the component: `payment-success`, `payment-error`, `payment-reset`.

The same shape would scale to sibling components (`<apple-pay-button>`, `<saved-cards>`, `<paypal-button>`, and so on): each one self-contained, configurable, and event-driven, so host pages across web properties can drop them in without having to re-implement payment plumbing.

## Try it

```bash
npm install
npm start
```

Then open:

- [http://127.0.0.1:8080/demo/](http://127.0.0.1:8080/demo/) — interactive demo page
- [http://127.0.0.1:8080/demo/docs.html](http://127.0.0.1:8080/demo/docs.html) — usage guide (Vanilla JS + React)

The demo page simulates a "bank" response via the toggle — flip it to see the success and error flows.

## Project tour

```
components/
  payment-form.js         The custom element + validators
  payment-form.test.js    Vitest + fast-check (property-based) tests
demo/
  index.html              Demo page
  demo.js                 Host-page wiring — configure() + event listeners
  demo.test.js            Demo-page unit tests
  docs.html               Usage guide for other teams
  styles.css
```

## Testing

Each package has its own test runner:

```bash
cd components && npm test    # component tests
cd demo && npm test          # demo-page tests
```

## What this repo is not

- Not a real payment integration — the processor is simulated.
- Not a published package — the component is loaded via relative `<script type="module">` for demo purposes.
- Not browser-hardened — no CSP, Trusted Types, or anti-skimming protections that a production payment component would need.

It is a starting point for a conversation about *shape* — what the API could look like, how host pages would interact with it, and how much is isolated inside the component.
