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

1. Onboard organizations using Connect. Connect Express is the fastest way to get an organization on to Stripe so you can transfer donations directly to them as they come in. The organization can add their bank account information to their Stripe accounts to pay out the funds. 

2. Create a PaymentIntent on the server for the initial order amount
```
const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: currency
});
```

3. When a customer checks the "round up" checkbox, update the Payment Intent with the new amount (rounded up to the nearest dollar) and add metadata to the PaymentIntent describing which organization it's for.

```
stripe.paymentIntents.update(id, 
    {
        amount,
        transfer_group: `group_${id}`,
        metadata: {
        isDonating: true,
        destination: selectedAccount,
        donationAmount: 91 // Hardcoded for demo but this would change depending on the order
    }
});
```

4. When the payment has succeeded, transfer the donation amount to that selected organization

```
const { transfer } = await stripe.transfers.create({
    amount: data.object.metadata.donationAmount,
    currency: "eur",
    destination: data.object.metadata.destination,
    transfer_group: data.object.transfer_group
});
```