import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { generateSafeWord } from './safeWordGenerator';

export interface WalletInfo {
  publicKey: string;
  secretArray: number[];
  secretBase58: string;
  safeWord: string;
}

/** Generates an Ed25519 keypair compatible with Phantom's "Import Private Key" with safe word security. */
export async function generateWallet(): Promise<WalletInfo> {
  console.log('🔐 Generating new wallet with safe word protection...');

  const kp = Keypair.generate();                   // 64-byte secret key
  const secretKeyBytes = Array.from(kp.secretKey); // number[]

  // WRAP the encode in try/catch
  let secretKeyBase58 = "";
  try {
    secretKeyBase58 = bs58.encode(kp.secretKey);
  } catch (e) {
    console.error("Base58 encode failed", e);
    throw new Error("Failed to encode wallet private key");
  }

  // Generate cryptographically secure safe word (4 words = 44 bits entropy)
  const safeWordInfo = generateSafeWord(4);
  console.log(`🔒 Safe word generated with ${safeWordInfo.entropy} bits of entropy`);

  const publicKey = kp.publicKey.toBase58();

  // Persist in localStorage (including safe word)
  localStorage.setItem("ceelo_pub", publicKey);
  localStorage.setItem("ceelo_priv_b58", secretKeyBase58);
  localStorage.setItem("ceelo_priv_arr", JSON.stringify(secretKeyBytes));
  localStorage.setItem("ceelo_safe_word", safeWordInfo.safeWord);

  console.log('✅ Wallet generated with safe word protection:', publicKey);

  return {
    publicKey,
    secretArray: secretKeyBytes,   // for restoring inside CeeloSol
    secretBase58: secretKeyBase58, // for Phantom import
    safeWord: safeWordInfo.safeWord // for additional authentication security
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
