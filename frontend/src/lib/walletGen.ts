import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export interface WalletInfo {
  publicKey: string;
  secretArray: number[];
  secretBase58: string;
}

/** Generates an Ed25519 keypair compatible with Phantom's "Import Private Key". */
export async function generateWallet(): Promise<WalletInfo> {
  const kp = Keypair.generate();                   // 64-byte secret key
  const secretKeyBytes = Array.from(kp.secretKey); // number[]

  // WRAP the encode in try/catch
  let secretKeyBase58 = "";
  try {
    secretKeyBase58 = bs58.encode(kp.secretKey);
  } catch (e) {
    console.error("Base58 encode failed", e);
  }

  // Persist in localStorage
  localStorage.setItem("ceelo_pub", kp.publicKey.toBase58());
  localStorage.setItem("ceelo_priv_b58", secretKeyBase58);
  localStorage.setItem("ceelo_priv_arr", JSON.stringify(secretKeyBytes));

  return {
    publicKey: kp.publicKey.toBase58(),
    secretArray: secretKeyBytes,   // for restoring inside CeeloSol
    secretBase58: secretKeyBase58  // for Phantom import
  };
}

/** Helper to download the secret as JSON */
export function downloadKeyJSON(bytes: number[]) {
  const blob = new Blob([JSON.stringify(bytes)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ceelosol-secret.json";
  a.click();
  URL.revokeObjectURL(url);
}
