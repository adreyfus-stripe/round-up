# Round up and donate

A round up and donate program allows your customers to round their order total to the nearest dollar and donate the difference to an organization.

Examples programs can be found at [Lyft](https://www.lyft.com/round-up) and in grocery stores. A round-up program should:

- Have a way to onboard organizations who want to accept donations
- Offer the customer the ability to opt-in to the round up program
- Transfer the donation either instantly using Stripe Connect or with a check / bank transfer on a regular (i.e monthly) cadence
- [optionally] For recurring customers, track how much each customer has donated and send a summary at the end of the month

This demo uses Connect Express to onboard non-profits onto Stripe and the [Charges API](https://stripe.com/docs/charges) to process payments. If you are looking for our Payment Intents API (SCA-complaint for upcoming European regulations), please see the [`master`](https://github.com/adreyfus-stripe/round-up/tree/master) branch

## Requirements

- Node v10.6.0+
- A Stripe account
- [Stripe Connect](https://stripe.com/docs/connect)

## Running the demo

- `git clone https://github.com/adreyfus-stripe/round-up`
- Copy the .env.example to .env with your [Stripe test API keys](https://stripe.com/docs/development#api-keys)
- Run `npm install` to download dependencies
- Run `npm start`

## Overview

### 1. Onboard organizations using Connect.

Connect Express is the fastest way to get an organization on to Stripe so you can transfer donations directly to them as they come in.
The organization can add their bank account information to their Stripe accounts to pay out the funds.

### 2. Show some UI to let a user opt-in to donating.

When a customer chooses to round up their order and donate the extra amount, you should create a Charge with a new order amount rounded up to the nearest dollar (eg; 6000 for a 5909 order).
You can use the [metadata](https://stripe.com/docs/api/metadata) field to store information about the intended donation.

```
const charge = await stripe.charges.create({
    amount: orderAmount,
    currency: currency,
    source: token,
    transfer_group: transferGroup,
    metadata: { // Storing info in the charge metadata lets you track info about the donation
        donationOrg: selectedAccount,
        donationAmount: donation
    }
});

```

### 3. Transfer the donation amount to that selected organization when the payment succeeds.

You can associate this donation with the original payment by using the same `transfer_group` id.

Using the Transfers API requires onboarding the organization using Stripe's Connect product and only in situations where both the platform and the connected account are in the same region (i.e both in Europe or both in US). If you do not want to use Connect to directly transfer the donations, you can create your own cron job to read the recent sucessful payments and calculate the amount to send to the organization from the metadata.

```
// After stripe.charges.create succeeds

const transfer = await stripe.transfers.create({
    amount: donationAmount,
    currency: "usd",
    destination: charge.metadata.donationOrg,
    transfer_group: transferGroup
});
```
