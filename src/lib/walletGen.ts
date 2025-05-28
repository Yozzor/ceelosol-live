
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";
import { addToWhitelist } from "./whitelist";
import { saveWalletSecurely, WalletData } from './walletPersistence';

export interface WalletInfo {
  publicKey: string;
  secretArray: number[];
  secretBase58: string;
}

/** Generates an Ed25519 keypair compatible with Phantom's "Import Private Key" with GUARANTEED PERSISTENCE. */
export async function generateWallet(): Promise<WalletInfo> {
  console.log('🔐 Generating new wallet with maximum security...');

  const kp = web3.Keypair.generate();                   // 64-byte secret key
  const secretKeyBytes: number[] = Array.from(kp.secretKey); // number[] - full 64 bytes for CLI

  // For Phantom wallet, we need the FULL 64-byte secret key encoded in Base58
  // WRAP the encode in try/catch
  let secretKeyBase58 = "";
  try {
    secretKeyBase58 = bs58.encode(kp.secretKey); // Encode the full 64-byte secret key for Phantom
  } catch (e) {
    console.error("Base58 encode failed", e);
    throw new Error("Failed to encode wallet private key");
  }

  const publicKey = kp.publicKey.toBase58();

  // Create comprehensive wallet data
  const walletData: WalletData = {
    publicKey,
    secretBase58: secretKeyBase58,
    secretArray: secretKeyBytes,
    createdAt: new Date().toISOString(),
  };

  // SAVE WITH MAXIMUM REDUNDANCY - NEVER LOSE THIS WALLET!
  saveWalletSecurely(walletData);

  // Add to whitelist with guaranteed persistence
  addToWhitelist(publicKey);

  console.log('✅ Wallet generated and saved with maximum security:', publicKey);

  return {
    publicKey,
    secretArray: secretKeyBytes,   // for restoring inside CeeloSol (full 64 bytes)
    secretBase58: secretKeyBase58  // for Phantom import (full 64 bytes in Base58)
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
