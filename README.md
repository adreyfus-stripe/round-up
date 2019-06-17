# Round up and donate

You can easily add a feature to your store to enable "round up and donate". 
When a user go to pay, they can opt-in to a feature that will round up their order amount to the nearest dollar amount and select an organization to donate the funds to.


## Requirements
* Node v10.6.0+
* [Stripe Connect](https://stripe.com/docs/connect)

## Running the demo

* `git clone https://git.corp.stripe.com/adreyfus/round-up-recipe`
* Copy the .env.example to .env with your Stripe test keys
* Run `npm start`

## Overview

### 1. Onboard organizations using Connect. 

Connect Express is the fastest way to get an organization on to Stripe so you can transfer donations directly to them as they come in. 
The organization can add their bank account information to their Stripe accounts to pay out the funds. 


### 2. Show some UI to let a user opt-in to donating.

When a customer chooses to round up their order and donate the extra amount, you should create a Charge with a new order amount rounded up to the nearest dollar (eg; 6000 for a 5909 order). 
You can use the [metadata](https://stripe.com/docs/api/metadata) field to store information about the intended donation. 

```
const charge = await stripe.charges.create({
    amount: total,
    currency: currency,
    source: token,
    transfer_group: transferGroup,
    metadata: { // Storing info in the charge metadata lets you track info about the donation
        isDonating: true,
        destination: selectedAccount,
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
    amount: 1,
    currency: "usd",
    destination: charge.metadata.destination,
    transfer_group: transferGroup
});
```