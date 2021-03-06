import { useEffect, useState } from "react";

import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";

import idl from "./idl.json";
import kp from "./keypair.json";

const { SystemProgram } = web3;

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl("devnet");

const opts = {
  preflightCommitment: "processed",
};

// Constants
const TWITTER_HANDLE = "ReeceRose18";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

  const checkIfWalletIsconnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        console.error(
          "Failed to get Phantom wallet. Go to http://phantom.app/"
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const fetchGifs = async () => {
    if (walletAddress) {
      try {
        const provider = getProvider();
        const program = new Program(idl, programID, provider);
        const account = await program.account.baseAccount.fetch(
          baseAccount.publicKey
        );
        console.log("Got the account", account);
        account.gifList.sort((gif1, gif2) => gif1.gifUpvotes - gif2.gifUpvotes);
        setGifList(account.gifList);
      } catch (e) {
        console.log("Error getting GIF list", e);
        setGifList(null);
      }
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.initialize({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        "Created a new BaseAccount w/ address:",
        baseAccount.publicKey.toString()
      );
      await fetchGifs();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error);
    }
  };

  const upvoteGif = async (gif) => {
    console.log(gif);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.upvoteGif(gif.gifLink, gif.userAddress, {
        accounts: {
          baseAccount: baseAccount.publicKey,
        },
      });
      console.log("GIF succesfully upvoted!");
      await fetchGifs(); // Might be better to directly update state, but this will 'auto refresh' the feed
    } catch (e) {
      console.log("Error upvoting GIF:", e);
    }
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No link");
      return;
    }
    setInputValue("");
    console.log("Gif link:", inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF succesfully sent to program!");
      await fetchGifs();
    } catch (e) {
      console.log("Error sending GIF:", e);
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Phantom Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    } else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {gifList.map((gif, index) => (
              <div className="gif-item" key={index}>
                <img src={gif.gifLink} alt={gif.gifLink} />
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    "https://explorer.solana.com/address/" +
                    gif.userAddress.toString() +
                    "?cluster=devnet"
                  }
                  className="gif-user"
                >
                  User: {gif.userAddress.toString()}
                </a>
                <div className="upvote-container">
                  <button
                    className="upvote"
                    onClick={async () => await upvoteGif(gif)}
                  >
                    Upvote
                  </button>
                  <p className="upvote-count">{gif.gifUpvotes.toString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsconnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  });

  useEffect(() => {
    fetchGifs();
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">???? GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ???
          </p>
          <div className="personal-info">
            <img
              alt="Twitter Logo"
              className="twitter-logo"
              src={twitterLogo}
            />
            <a
              className="personal-info-text"
              href={TWITTER_LINK}
              target="_blank"
              rel="noreferrer"
            >{`built by @${TWITTER_HANDLE}`}</a>
          </div>
        </div>
        {!walletAddress && renderNotConnectedContainer()}
        {walletAddress && renderConnectedContainer()}
      </div>
    </div>
  );
};

export default App;
