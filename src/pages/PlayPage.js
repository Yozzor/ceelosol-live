import React, { useCallback, useState, useEffect } from "react";
import Typography from "@material-ui/core/Typography/Typography";

import {
  Account,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

import {useConnection} from "../util/connection";
import { getConnection } from "../lib/rpc";
import { useWallet } from "../util/wallet";
import { useAuth } from "../util/auth";
import { LoginButton, RegisterButton, RestoreWalletButton, AuthStatus } from "../components/AuthComponents";
import { WhitelistAdmin } from "../components/WhitelistAdmin";
import { DiceTable } from "../components/DiceTable";
import { ActivityFeed } from "../components/ActivityFeed";
import "../components/GameResults.css";
import "../components/GameStyling.css";


const acc = "vFj/mjPXxWxMoVxwBpRfHKufaxK0RYy3Gd2rAmKlveF7oiinGDnsXlRSbXieC5x6prka4aQGE8tFRz17zLl38w==";
const treasuryAccount = new Account(Buffer.from(acc, "base64"));

// Treasury wallet address for display
const TREASURY_ADDRESS = treasuryAccount.publicKey.toBase58();

let payerAccount = new Account(Buffer.from("xpCzQo06gWIJtRCXglEMkXUQNQG8UrA8yVGDtA93qOQnLtX3TnG+kZCsmHtanJpFluRL958AbUOR7I2HKK4zlg==", "base64"));
let sysvarClockPubKey = new PublicKey('SysvarC1ock11111111111111111111111111111111');
let sysvarSlotHashesPubKey = new PublicKey('SysvarS1otHashes111111111111111111111111111');
let splTokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

let programId = new PublicKey("8Nj5RBeppFvrLzF5t4t5i3i3B2ucx9qVUxp2nc5dVDGt");
let treasuryTokenAccount = new PublicKey("6ME9zXExwYxqGV3XiXGVQwvQS6mq5QCucaVEnF5HyQ71");


export function PlayPage() {
    const connection = useConnection();
    const [history, setHistory] = useState([]);
    const [wager, setWager] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [balance, setBalance] = useState(0);
    const [isBalanceUpdating, setIsBalanceUpdating] = useState(false);
    const [lastBalanceCheck, setLastBalanceCheck] = useState(0);
    const { publicKey, wallet, connected } = useWallet();
    const { isAuthenticated, publicKey: authPublicKey } = useAuth();

    const [fundBalance, setFundBalance] = useState(0);
    const [fundBalanceDollar, setFundBalanceDollar] = useState(0);
    const [maxProfitAllowed, setMaxProfitAllowed] = useState(0);

    const refreshTreasuryBalance = useCallback(() => {
        (async () => {
          try {
            // Add retry logic for rate limits
            let retries = 3;
            let balance;

            while (retries > 0) {
              try {
                balance = await connection.getBalance(
                  treasuryAccount.publicKey,
                  "singleGossip"
                );
                break; // Success, exit retry loop
              } catch (error) {
                if (error.message?.includes('429') && retries > 1) {
                  console.warn(`Treasury balance rate limited, retrying in ${4 - retries} seconds...`);
                  await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
                  retries--;
                } else {
                  throw error; // Re-throw if not rate limit or no retries left
                }
              }
            }

            setFundBalance(balance/LAMPORTS_PER_SOL);
            setFundBalanceDollar((balance/LAMPORTS_PER_SOL)*2.23); // TODO
            setMaxProfitAllowed((balance/LAMPORTS_PER_SOL)*0.01); // TODO
          } catch (err) {
              console.log('Treasury balance refresh failed:', err);

              // If rate limited, show user-friendly message
              if (err.message?.includes('429')) {
                console.warn('Rate limited - treasury balance update skipped');
              }
          }
        })();
    }, [connection]);

    const refreshBalance = useCallback(() => {
        (async () => {
          try {
            if (!authPublicKey) return;

            // Debounce: prevent multiple rapid balance checks
            const now = Date.now();
            if (now - lastBalanceCheck < 30000) { // 30 second minimum between checks
                console.log('Balance check debounced - too soon since last check');
                return;
            }

            setIsBalanceUpdating(true);
            setLastBalanceCheck(now);

            const pubKey = new PublicKey(authPublicKey);

            // Use the new RPC system with queue
            const connection = await getConnection();
            const balance = await connection.getBalance(pubKey, "confirmed");

            setBalance(balance / LAMPORTS_PER_SOL);

            // Visual indicator that balance was updated
            setTimeout(() => {
              setIsBalanceUpdating(false);
            }, 1000);
          } catch (err) {
              console.log('Balance refresh failed:', err);
              setIsBalanceUpdating(false);

              // If rate limited, show user-friendly message
              if (err.message?.includes('429')) {
                console.warn('Rate limited - balance update skipped');
              }
          }
        })();
    }, [authPublicKey, lastBalanceCheck]);

    const refreshWager = useCallback((event) => {
        setWager(parseFloat(event.target.value).toFixed(9));
    }, []);

    // Initial balance refresh when authenticated
    useEffect(() => {
        if (isAuthenticated && refresh === 0) {
            setRefresh(1);
            refreshBalance();
            refreshTreasuryBalance();
        }
    }, [isAuthenticated, refresh, refreshBalance, refreshTreasuryBalance]);

    // Poll for balance updates every 2 minutes (reasonable to avoid rate limits)
    useEffect(() => {
        let intervalId;

        if (isAuthenticated) {
            // Initial balance check
            refreshBalance();

            // Set up polling interval with much longer delay to avoid rate limits
            intervalId = setInterval(() => {
                refreshBalance();
            }, 120000); // 120 seconds (2 minutes - reasonable)
        }

        // Clean up interval on unmount or when authentication changes
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAuthenticated, refreshBalance]);

    const handleGameResult = (result) => {
        // Add the result to history
        const newHistoryItem = {
            wager_count: history.length,
            dice: result.dice.join(', '),
            outcome: result.outcome,
            point: result.point,
            wager: wager,
            profit: result.profit ? (result.profit / 1000000000).toFixed(4) : null, // Convert lamports to SOL
            payout: result.payout ? (result.payout / 1000000000).toFixed(4) : null, // Convert lamports to SOL
            result: `${result.outcome}${result.point ? ` (${result.point})` : ''}`,
            txid: result.signature || null, // Transaction signature from settlement
        };

        // DON'T refresh balance immediately to prevent spam - wait for next scheduled refresh

        setHistory([newHistoryItem, ...history]);
    };

    const results = history.map((result, index) => {
      const dice = result.dice || '';
      const wager = result.wager || '';
      const outcome = result.outcome || '';
      const point = result.point ? ` (${result.point})` : '';
      const profit = result.profit ? (parseFloat(result.profit) >= 0 ? `+${result.profit}` : result.profit) : '';
      const payout = result.payout || '';
      const wager_c = index + 1;
      const txid = result.txid || '';
      const link = txid ? `https://explorer.solana.com/tx/${txid}?cluster=devnet` : '';

      return (
        <div key={wager_c} className={`game-result ${outcome}`}>
            <p>
                <strong>#{wager_c}:</strong> &nbsp;&nbsp;&nbsp;&nbsp;
                <span>Dice: {dice}</span> &nbsp;&nbsp;&nbsp;
                <span>Wager: {wager} SOL</span> &nbsp;&nbsp;&nbsp;
                <span>Outcome: {outcome}{point}</span> &nbsp;&nbsp;&nbsp;
                {profit && <span className={parseFloat(profit) >= 0 ? 'profit-positive' : 'profit-negative'}>
                  Profit: {profit} SOL
                </span>}
                &nbsp;&nbsp;&nbsp;
                {payout && <span>Payout: {payout} SOL</span>}
                &nbsp;&nbsp;&nbsp;
                {txid && (
                    <a
                        className="btn btn-sm btn-secondary ml-3 text-center"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        explorer
                    </a>
                )}
            </p>
        </div>
      );
    });
    return (
        <div className="game-container">
            <div className="container">
                <div className="row justify-content-center mt-3">
                 <div className="col-md-4">
                    <div className="h-100 game-card text-white">
                        <div className="game-card-header text-center">
                            <h2 className="m-0">Treasury Balance</h2>
                        </div>
                        <div className="card-body text-center treasury-info">
                            {connected ?
                                <Typography>
                                    {fundBalance} SOL <br></br>
                                    (${fundBalanceDollar.toFixed(2)})
                                    <br></br>
                                    <small className="text-muted">
                                        Address: {TREASURY_ADDRESS.substring(0, 8)}...{TREASURY_ADDRESS.substring(TREASURY_ADDRESS.length - 8)}
                                    </small>
                                </Typography>
                                :
                                <Typography>
                                    Not Connected
                                </Typography>
                            }
                        </div>
                    </div>
                </div>
                <div className="col-md-8 mt-4 mt-md-0">
                    <div className="game-card text-white">
                        <div className="game-card-header text-center">
                            <h2 className="m-0">My Account {isAuthenticated ? '- Connected' : '- Disconnected'}</h2>
                        </div>
                        <div className="card-body account-section">
                            {isAuthenticated ? (
                                <div>
                                    <AuthStatus />
                                    <div className="mt-2">
                                        <Typography>
                                            SOL Account: {authPublicKey} <br></br>
                                            Balance: <span className={`balance-display ${isBalanceUpdating ? 'balance-updating' : ''}`}>
                                              {balance.toFixed(6)} SOL
                                            </span>
                                            <small className="ml-2 text-muted">(updates every 2min)</small>
                                            <br></br>
                                            <button
                                                className="btn btn-sm mt-2"
                                                style={{
                                                    background: 'linear-gradient(135deg, #6b5b2f, #8b4513)',
                                                    border: '2px solid #4a4a3a',
                                                    color: '#e1e1e1',
                                                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                                    borderRadius: '8px',
                                                    fontWeight: '600'
                                                }}
                                                onClick={async () => {
                                                    try {
                                                        const { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
                                                        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
                                                        const pubKey = new PublicKey(authPublicKey);
                                                        console.log('🪂 Requesting airdrop...');
                                                        const signature = await connection.requestAirdrop(pubKey, 2 * LAMPORTS_PER_SOL);
                                                        await connection.confirmTransaction(signature);
                                                        console.log('✅ Airdrop successful!');
                                                        alert('Airdrop successful! You received 2 SOL for testing.');
                                                        // Refresh balance
                                                        setTimeout(() => {
                                                            refreshBalance();
                                                        }, 2000);
                                                    } catch (error) {
                                                        console.error('❌ Airdrop failed:', error);
                                                        alert('Airdrop failed: ' + error.message);
                                                    }
                                                }}
                                            >
                                                🪂 Get Test SOL (Devnet)
                                            </button>
                                        </Typography>
                                    </div>
                                    <WhitelistAdmin />
                                </div>
                            ) : (
                                <div>
                                    <div className="row">
                                        <div className="col-md-4 mb-2">
                                            <LoginButton />
                                        </div>
                                        <div className="col-md-4 mb-2">
                                            <RegisterButton />
                                        </div>
                                        <div className="col-md-4">
                                            <RestoreWalletButton />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mt-4 mb-3">
                 {/*<div className="col-md-4">*/}
                    {/*<div className="h-100 bg-half-transparent sr-border text-white">*/}
                        {/*<div className="card-header text-center">*/}
                            {/*RECENT PLAYS*/}
                        {/*</div>*/}
                        {/*<div className="card-body text-center">*/}
                            {/*{connected ?*/}
                                {/*<Typography>*/}
                                    {/*Roll Under: 56   Result: 21  WIN*/}
                                {/*</Typography>*/}
                                {/*:*/}
                                {/*<Typography>*/}
                                    {/*Not Connected*/}
                                {/*</Typography>*/}
                            {/*}*/}
                        {/*</div>*/}
                    {/*</div>*/}
                {/*</div>*/}
                <div className="col-md-12">
                    <div className="game-card text-white">
                        <div className="game-card-header text-center">
                            <h1 className="m-0">Play Cee-Lo</h1>
                        </div>
                        <div className="card-body">
                            {/* Bet Configuration Section */}
                            <div className="bet-config-section">
                                <h3 className="text-center mb-3" style={{
                                    fontFamily: "'Pricedown', 'Impact', sans-serif",
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    color: 'var(--sa-gold)',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                                    fontWeight: 'normal'
                                }}>
                                    🎲 Configure Your Bet 🎲
                                </h3>

                                {/* Current Balance Display */}
                                <div className="text-center mb-3">
                                    <span className="balance-badge" style={{
                                        background: 'linear-gradient(135deg, #2d5016, #4a4a3a)',
                                        color: '#e1e1e1',
                                        border: '2px solid #8b4513',
                                        borderRadius: '8px',
                                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                                    }}>
                                        Your Balance: {balance.toFixed(6)} SOL
                                    </span>
                                </div>

                                {/* Preset Bet Buttons */}
                                <div className="row mb-3">
                                    <div className="col-12">
                                        <label className="text-white mb-2" style={{fontWeight: 'bold'}}>
                                            Quick Bet Amounts:
                                        </label>
                                        <div className="quick-bet-container">
                                            {[0.01, 0.05, 0.1, 0.25, 0.5, 1.0].map(amount => (
                                                <button
                                                    key={amount}
                                                    className={`quick-bet-btn ${parseFloat(wager) === amount ? 'active' : ''}`}
                                                    onClick={() => setWager(amount.toString())}
                                                    style={{
                                                        background: parseFloat(wager) === amount ?
                                                            'linear-gradient(135deg, #2d5016, #36682c)' :
                                                            'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                                                        border: '2px solid #8b4513',
                                                        color: '#e1e1e1',
                                                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                                        borderRadius: '8px',
                                                        padding: '8px 16px',
                                                        minWidth: '80px',
                                                        fontWeight: '600',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                >
                                                    {amount} SOL
                                                </button>
                                            ))}
                                            <button
                                                className={`quick-bet-btn ${parseFloat(wager) === balance ? 'active' : ''}`}
                                                onClick={() => setWager(balance.toString())}
                                                disabled={balance <= 0}
                                                style={{
                                                    background: parseFloat(wager) === balance ?
                                                        'linear-gradient(135deg, #722f37, #8b4513)' :
                                                        'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
                                                    borderColor: '#722f37',
                                                    color: '#e1e1e1',
                                                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                                    border: '2px solid #722f37'
                                                }}
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Amount Input */}
                                <div className="row">
                                    <div className="col-md-8 mx-auto">
                                        <label className="text-white mb-2" style={{fontWeight: 'bold'}}>
                                            Custom Bet Amount (SOL):
                                        </label>
                                        <div className="input-group">
                                            <input
                                                className="form-control text-center"
                                                type="number"
                                                step="0.001"
                                                min="0.001"
                                                max={balance}
                                                value={wager}
                                                onChange={refreshWager}
                                                style={{
                                                    fontSize: '1.2rem',
                                                    fontWeight: 'bold',
                                                    border: '2px solid #8b4513',
                                                    background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                                                    color: '#e1e1e1',
                                                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                                    borderRadius: '8px 0 0 8px'
                                                }}
                                                placeholder="Enter SOL amount"
                                            />
                                            <div className="input-group-append">
                                                <span className="input-group-text" style={{
                                                    fontWeight: 'bold',
                                                    border: '2px solid #8b4513',
                                                    background: 'linear-gradient(135deg, #8b4513, #4a4a3a)',
                                                    color: '#e1e1e1',
                                                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                                    borderRadius: '0 8px 8px 0'
                                                }}>
                                                    SOL
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bet Validation */}
                                        {parseFloat(wager) > balance && (
                                            <small className="mt-1 d-block" style={{
                                                color: '#722f37',
                                                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                                fontWeight: 'bold'
                                            }}>
                                                ⚠️ Insufficient balance! You only have {balance.toFixed(6)} SOL
                                            </small>
                                        )}
                                        {parseFloat(wager) < 0.001 && (
                                            <small className="mt-1 d-block" style={{
                                                color: '#6b5b2f',
                                                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                                fontWeight: 'bold'
                                            }}>
                                                ⚠️ Minimum bet is 0.001 SOL
                                            </small>
                                        )}

                                        {/* Potential Winnings */}
                                        {parseFloat(wager) > 0 && parseFloat(wager) <= balance && (
                                            <div className="text-center mt-2">
                                                <small style={{
                                                    color: '#2d5016',
                                                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    💰 Potential Winnings: {(parseFloat(wager) * 2).toFixed(6)} SOL
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Game Section */}
                            {isAuthenticated ? (
                                <DiceTable
                                    stakeLamports={wager * LAMPORTS_PER_SOL}
                                    onResult={handleGameResult}
                                    userBalance={balance}
                                />
                            ) : (
                                <div className="text-center mt-4">
                                    <p>Please register or login to play</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mt-4 mb-3">
                <div className="col-md-8">
                    <div className="game-card text-white">
                        <div className="game-card-header text-center">
                            <h2 className="m-0">Results</h2>
                        </div>
                        <div className="card-body results-section">
                            <div>{results}</div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <ActivityFeed />
                </div>
            </div>
            </div>
        </div>
    );
}