# [wip] Round up and donate

A round up and donate program allows your customers to round their order total to the nearest dollar and donate the difference to an organization.

Examples programs can be found at [Lyft](https://lyft.com/round-up) and in some grocery stores. A round-up program should:
* Have a way to onboard organization who want to accept donations
* Offer the customer the ability to opt-in to the round up program
* Transfer the donation either instantly using Stripe Connect or with a check / bank transfer on a regular (i.e monthly) cadence
* [optionally] For recurring customers, track how much each customer has donated and send a summary at the end of the month

This demo uses Connect Express to onboard organizations and uses the Payment Intents API to process payments. You can see an example of using the Charges API in the [charges-solution](https://git.corp.stripe.com/adreyfus/round-up-recipe/tree/charges-solution) branch.

## Requirements
* Node v10.6.0+
* A Stripe account
* [Stripe Connect](https://stripe.com/docs/connect)

## Running the demo

* `git clone https://git.corp.stripe.com/adreyfus/round-up-recipe`
* Copy the .env.example to .env with your Stripe test keys
* Run `npm start`

## Overview

1. Onboard organizations using Connect. 

Connect Express is the fastest way to get an organization on to Stripe so you can transfer donations directly to them as they come in. 
The organization can add their bank account information to their Stripe accounts to pay out the funds. 

2. Create a PaymentIntent on the server for the initial order amount when a customer lands on your payment page.

```
const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: currency
});
```

3. Update the PaymentIntent amount when a customer chooses to round up their order.

When a customer chooses to round up their order and donate the extra amount, you should update the PaymentIntent with a new order amount rounded up to the nearest dollar (eg; 6000 for a 5909 order). 
You can use the [metadata](https://stripe.com/docs/api/metadata) field to store information about the intended donation. The transfer

```
stripe.paymentIntents.update(id, {
    amount: newAmount,
    transfer_group: `group_${id}`,
    metadata: {
        isDonating: true,
        destination: selectedAccount,
        donationAmount: 91 // Hardcoded for demo but this would change depending on the order
    }
});
```

4. Transfer the donation amount to that selected organization when the payment succeeds. 

You can associate this donation with the original payment by using the same `transfer_group` id. 

Using the Transfers API requires onboarding the organization using Stripe's Connect product and only in situations where both the platform and the connected account are in the same region (i.e both in Europe or both in US). If you do not want to use Connect to directly transfer the donations, you can create your own cron job to read the recent sucessful payments and calculate the amount to send to the organization from the metadata.  

```
// In a webhoook listening for the payment_intent.succeeded event

const { transfer } = await stripe.transfers.create({
    amount: data.object.metadata.donationAmount,
    currency: "eur",
    destination: data.object.metadata.destination,
    transfer_group: data.object.transfer_group
});
```