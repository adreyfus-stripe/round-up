const express = require("express");
const app = express();
const { resolve } = require("path");
const envPath = resolve(".env");
const env = require("dotenv").config({ path: envPath });
const stripe = require("stripe")(env.parsed.STRIPE_SECRET_KEY);
const axios = require("axios");

app.use(express.static("./client"));
app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function(req, res, buf) {
      if (req.originalUrl.startsWith("/webhook")) {
        req.rawBody = buf.toString();
      }
    }
  })
);
app.set("view engine", "ejs");
app.set("views", resolve("./client/views"));

// Render the checkout page
app.get("/", (req, res) => {
  res.render("index.ejs", { isComplete: false });
});

// Render the become a partner page
app.get("/become-a-partner", (req, res) => {
  const stateValue = `some-random-value-${Math.floor(Math.random() * 1000)}`;
  const url = `https://connect.stripe.com/express/oauth/authorize?redirect_uri=${
    env.parsed.REDIRECT_DOMAIN
  }/verify-account&client_id=${
    env.parsed.STRIPE_CONNECT_CLIENT_ID
  }&state=${stateValue}`;

  res.render("connect-onboarding.ejs", { url });
});

// Verify account and create a connected account
app.get("/verify-account", async (req, res) => {
  axios
    .post("https://connect.stripe.com/oauth/token", {
      client_secret: env.parsed.STRIPE_SECRET_KEY,
      code: req.query.code,
      grant_type: "authorization_code"
    })
    .then(() => {
      const path = resolve("./client/connect-onboarding.html");
      res.sendFile(path);
    })
    .catch(err => {
      console.log("err", err);
    });
});

const calculateOrderTotal = (items, currency) => {
  // Hardcoding for demo purposes
  // In your real app calculate the order total from the items in the cart + selected currency
  return 5909;
};

const roundOrderUp = (items, currency) => {
  // Hardcoding for demo purposes
  // In your real app calculate the order total and round up to the nearest dollar
  return { total: 6000, donation: 91 };
};

// Fetch all the connected accounts that represent the organizations a customer can donate to
app.get("/setup-checkout-session", async (req, res) => {
  // Fetch connected accounts to display in our donation dropdown
  const connectedAccounts = await stripe.accounts.list({ limit: 3 });
  const publicKey = env.parsed.STRIPE_PUBLIC_KEY;
  const connectedAccountIds = connectedAccounts.data.map(account => ({
    id: account.id,
    name: account.email // TODO: change to business_profile
  }));

  res.send({
    publicKey,
    connectedAccounts: connectedAccountIds
  });
});

// Pay for the order and transfer any donation amount
app.post("/pay", async (req, res) => {
  const {
    items,
    currency,
    token,
    createdDate,
    isDonating,
    selectedAccount
  } = req.body;
  const { total, donation } = roundOrderUp(items, currency);
  const transferGroup = `group_${createdDate}`; // Create a unique ID to represent this donation
  
  // Here we check for an isDonating flag that's set on the client
  // You could also have a flag on a user's account model to let them always opt-in to 
  // rounding up the order to donate
  if (isDonating) {
    // Create the charge with the order total + amount to donate
    const charge = await stripe.charges.create({
      amount: total,
      currency: currency,
      source: token,
      transfer_group: transferGroup,
      metadata: {
        // Storing info in the charge metadata lets you track info about the donation
        // Useful if you want to use webhooks to process charge.succeeded events
        donationOrg: selectedAccount,
        donationAmount: donation
      }
    });

    if (charge.status === "succeeded") {
      // Here we use Connect to directly transfer the funds to a connected account once the charge succeeds
      // but you can simply use metadata to flag payments that have added donations
      // and process a check once a month
      const transfer = await stripe.transfers.create({
        amount: charge.metadata.donationAmount,
        currency: "usd",
        destination: charge.metadata.donationOrg,
        transfer_group: transferGroup
      });
      console.log(
        `Processed a donation for ${
          charge.metadata.donationOrg
        } with transfer ${transfer.id}`
      );
    } else {
      // Build a recovery flow here to prompt the user for a new payment method
      console.log("The card provided could not be charged");
    }
  } else {
    // Not donating, process as a normal order
    stripe.charges.create({
      amount: calculateOrderTotal(items, currency),
      currency: currency,
      source: token
    });
  }
  res.send();
});

// Start server
const listener = app.listen(process.env.PORT || 3000, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
