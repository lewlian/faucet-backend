import express from "express";
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import cors from "cors";
import axios from "axios";
import { db } from "./firebase-config.js";
import { config } from "dotenv";
import { collection, getDocs, addDoc } from "firebase/firestore";
import rateLimit from 'express-rate-limit';
config();

const TEZOS_SECRET_KEY = process.env.TEZOS_SECRET_KEY;
const TEZOS_RPC_URL = process.env.TEZOS_RPC_URL;
const PORT = process.env.PORT || 2888;
const BEARER_TOKEN = process.env.BEARER_TOKEN;
const FAUCET_ADDRESS = process.env.FAUCET_ADDRESS;
const Tezos = new TezosToolkit(process.env.TEZOS_GRANADA_RPC_URL);
const app = express();
const faucetCollectionRef = collection(db, "dev-faucet");

Tezos.setProvider({ signer: new InMemorySigner(TEZOS_SECRET_KEY) });
const apiLimiter =rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 50,
  statusCode: 200,
  message: {
    status:429,
    error: 'Max redeem attempts reached for the day, try again in 24 hours.'
  },
  headers: true,
})

app.use(cors());
app.use("/redeem/", apiLimiter);
app.get("/redeem/:address/:twitter", async (req, res) => {
  const { address, twitter } = req.params;
  const amount = 1;
  console.log("fetching data from firestore");
  const data = await getDocs(faucetCollectionRef);
  const walletAddresses = data.docs.map((doc) => doc.get("address"));
  const twitterAccounts = data.docs.map((doc) => doc.get("twitter"));

  let faucetBalance;
  if (walletAddresses.includes(address)) {
    res.status(400).send("Wallet address has already redeemed");
    return;
  }
  if (twitterAccounts.includes(twitter)) {
    res.status(400).send("Twitter account has already been used");
    return;
  }
  console.log("Checking if there is sufficient balance in faucet...");
  try {
    faucetBalance = (await Tezos.tz.getBalance(FAUCET_ADDRESS)) / 10 ** 6;
    console.log("Faucet Balance: " + faucetBalance);
  } catch (error) {
    console.log(error);
  }
  if (faucetBalance >= amount) {
    console.log(`Transfering ${amount} ꜩ to ${address}...`);
    try {
      const op = await Tezos.contract.transfer({ to: address, amount: amount });
      console.log(`Waiting for ${op.hash} to be confirmed...`);
      res.status(200).send(
        `Request is successful, please check your wallet in a few minutes for your tez\n (https://granada.tzstats.com/${op.hash})`
      );
      await op.confirmation(1);
      console.log(`Confirmed - ${op.hash}`);
      console.log("Adding user to firestore database");
      await addDoc(faucetCollectionRef, {
        address: address,
        timestamp: parseInt((new Date().getTime() / 1000).toFixed(0)),
        twitter: twitter,
      });
      console.log("successfully added user to firestore");
      console.log(
        `Funds transferred. Check url for results: https://granada.tzstats.com/${op.hash}\n`
      );
    } catch (error) {
      console.error(error.message);
      res.status(500).send(JSON.stringify(error));
    }
  } else {
    res.status(400).send("Faucet has insufficient Balance");
    return;
  }
});

app.get("/verify/:username", async (req, res) => {
  const config = {
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
    },
  };
  const { username } = req.params;
  console.log("username: " + username);
  const getId = "https://api.twitter.com/2/users/by/username/" + username;
  try {
    const Idresp = await axios.get(getId, config);
    const userId = Idresp.data.data.id;
    console.log("user ID: ", userId);
    const api = `https://api.twitter.com/2/users/${userId}/tweets`;
    const resp = await axios.get(api, config);
    console.log(resp.data);
    const verified = resp.data.data[0].text.toLowerCase().includes("#tezos");
    console.log(verified);
    res.send(verified);
  } catch (error) {
    console.error(error.message);
    res.status(500).send(JSON.stringify(error, null, 2));
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running`);
});
