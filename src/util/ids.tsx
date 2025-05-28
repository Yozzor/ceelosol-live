import * as web3 from "@solana/web3.js";

export const WRAPPED_SOL_MINT = new web3.PublicKey(
  "So11111111111111111111111111111111111111112"
);
let TOKEN_PROGRAM_ID = new web3.PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

let SWAP_PROGRAM_ID: web3.PublicKey;
let SWAP_PROGRAM_LEGACY_IDS: web3.PublicKey[];

export const SWAP_HOST_FEE_ADDRESS = process.env.REACT_APP_SWAP_HOST_FEE_ADDRESS
  ? new web3.PublicKey(`${process.env.REACT_APP_SWAP_HOST_FEE_ADDRESS}`)
  : undefined;
export const SWAP_PROGRAM_OWNER_FEE_ADDRESS = new web3.PublicKey(
  "HfoTxFR1Tm6kGmWgYWD6J7YHVy1UwqSULUGVLXkJqaKN"
);

console.debug(`Host address: ${SWAP_HOST_FEE_ADDRESS?.toBase58()}`);
console.debug(`Owner address: ${SWAP_PROGRAM_OWNER_FEE_ADDRESS?.toBase58()}`);

// legacy pools are used to show users contributions in those pools to allow for withdrawals of funds
export const PROGRAM_IDS = [
  {
    name: "mainnet-beta",
    swap: () => ({
      current: new web3.PublicKey("9qvG1zUp8xF1Bi4m6UdRNby1BAAuaDrUxSpv4CmRRMjL"),
      legacy: [],
    }),
  },
  {
    name: "testnet",
    swap: () => ({
      current: new web3.PublicKey("2n2dsFSgmPcZ8jkmBZLGUM2nzuFqcBGQ3JEEj6RJJcEg"),
      legacy: [
        new web3.PublicKey("9tdctNJuFsYZ6VrKfKEuwwbPp4SFdFw3jYBZU8QUtzeX"),
        new web3.PublicKey("CrRvVBS4Hmj47TPU3cMukurpmCUYUrdHYxTQBxncBGqw"),
      ],
    }),
  },
  {
    name: "devnet",
    swap: () => ({
      current: new web3.PublicKey("BSfTAcBdqmvX5iE2PW88WFNNp2DHhLUaBKk5WrnxVkcJ"),
      legacy: [
        new web3.PublicKey("H1E1G7eD5Rrcy43xvDxXCsjkRggz7MWNMLGJ8YNzJ8PM"),
        new web3.PublicKey("CMoteLxSPVPoc7Drcggf3QPg3ue8WPpxYyZTg77UGqHo"),
        new web3.PublicKey("EEuPz4iZA5reBUeZj6x1VzoiHfYeHMppSCnHZasRFhYo"),
      ],
    }),
  },
  {
    name: "localnet",
    swap: () => ({
      current: new web3.PublicKey("5rdpyt5iGfr68qt28hkefcFyF4WtyhTwqKDmHSBG8GZx"),
      legacy: [],
    }),
  },
];

export const setProgramIds = (envName: string) => {
  let instance = PROGRAM_IDS.find((env) => env.name === envName);
  if (!instance) {
    return;
  }

  let swap = instance.swap();

  SWAP_PROGRAM_ID = swap.current;
  SWAP_PROGRAM_LEGACY_IDS = swap.legacy;
};

export const programIds = () => {
  return {
    token: TOKEN_PROGRAM_ID,
    swap: SWAP_PROGRAM_ID,
    swap_legacy: SWAP_PROGRAM_LEGACY_IDS,
  };
};
