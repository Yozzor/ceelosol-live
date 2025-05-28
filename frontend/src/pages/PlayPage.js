import React, { useCallback, useState, useEffect } from "react";
import Typography from "@material-ui/core/Typography/Typography";
import {
  Account,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

import { useConnection } from "../util/connection";
import { useWallet } from "../util/wallet";
import { DiceTable } from "../components/DiceTable";

const acc = "vFj/mjPXxWxMoVxwBpRfHKufaxK0RYy3Gd2rAmKlveF7oiinGDnsXlRSbXieC5x6prka4aQGE8tFRz17zLl38w==";
const treasuryAccount = new Account(Buffer.from(acc, "base64"));

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
    const { publicKey, wallet, connected } = useWallet();

    const [fundBalance, setFundBalance] = useState(0);
    const [fundBalanceDollar, setFundBalanceDollar] = useState(0);
    const [maxProfitAllowed, setMaxProfitAllowed] = useState(0);

    const refreshTreasuryBalance = useCallback(() => {
        (async () => {
          try {
            const balance = await connection.getBalance(
              treasuryAccount.publicKey,
              "singleGossip"
            );
            setFundBalance(balance/LAMPORTS_PER_SOL);
            setFundBalanceDollar((balance/LAMPORTS_PER_SOL)*2.23); // TODO
            setMaxProfitAllowed((balance/LAMPORTS_PER_SOL)*0.01); // TODO
          } catch (err) {
              console.log(err);
          }
        })();
    }, [connection]);

    const refreshBalance = useCallback(() => {
        (async () => {
          try {
            const balance = await connection.getBalance(
              wallet.publicKey,
              "singleGossip"
            );
            setBalance(balance / LAMPORTS_PER_SOL);
          } catch (err) {
              console.log(err);
          }
        })();
    }, [connection, wallet.publicKey]);

    const refreshWager = useCallback((event) => {
        setWager(parseFloat(event.target.value).toFixed(9));
    }, []);

    useEffect(() => {
        if (connected && refresh === 0) {
            setRefresh(1);
            refreshBalance();
            refreshTreasuryBalance();
        }
    }, [connected, refresh, refreshBalance, refreshTreasuryBalance]);

    const handleGameResult = (result) => {
        // Add the result to history
        const newHistoryItem = {
            wager_count: history.length,
            dice: result.dice.join(', '),
            outcome: result.outcome,
            point: result.point,
            wager: wager,
            result: `${result.outcome}${result.point ? ` (${result.point})` : ''}`,
            txid: null, // We would get this from the blockchain transaction
        };
        
        setHistory([newHistoryItem, ...history]);
    };

    const results = history.map((result, index) => {
      const dice = result.dice || '';
      const wager = result.wager || '';
      const outcome = result.outcome || '';
      const point = result.point ? ` (${result.point})` : '';
      const wager_c = index + 1;
      const txid = result.txid || '';
      const link = txid ? `https://explorer.solana.com/tx/${txid}?cluster=devnet` : '';
      
      return (
        <div key={wager_c}>
            <p>
                # {wager_c}: &nbsp;&nbsp;&nbsp;&nbsp; 
                Dice: {dice} &nbsp;&nbsp;&nbsp;
                Wager: {wager} SOL &nbsp;&nbsp;&nbsp; 
                Outcome: {outcome}{point} &nbsp;&nbsp;&nbsp;
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
        <div className="container">
            <div className="row justify-content-center mt-3">
                 <div className="col-md-4">
                    <div className="h-100 bg-half-transparent sr-border text-white">
                        <div className="card-header text-center">
                            TREASURY BALANCE
                        </div>
                        <div className="card-body text-center">
                            {connected ?
                                <Typography>
                                    {fundBalance} SOL <br></br>
                                    (${fundBalanceDollar.toFixed(2)})
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
                    <div className="bg-half-transparent sr-border text-white">
                        <div className="card-header text-center">
                            MY ACCOUNT - {connected ? 'Connected' : 'Disconnected'}
                        </div>
                        <div className="card-body">
                            {connected ?
                                <Typography>
                                    SOL Account: {publicKey} <br></br>
                                    Balance: {balance} SOL
                                </Typography>
                                :
                                <Typography>
                                    <button
                                        className="btn btn-secondary w-100"
                                        onClick={wallet.connect}
                                    >
                                      Connect
                                    </button>
                                </Typography>
                            }
                        </div>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mt-4 mb-3">
                <div className="col-md-12">
                    <div className="bg-half-transparent sr-border text-white">
                        <div className="card-header text-center">
                            PLAY CEE-LO
                        </div>
                        <div className="card-body">
                            <Typography id="user-account-text" gutterBottom>
                              <label>Wager (SOL):</label> 
                              <input 
                                className="form-control bg-dark text-white mt-1" 
                                type="number" 
                                value={wager} 
                                onChange={refreshWager}
                              />
                            </Typography>
                            
                            {connected ? (
                                <DiceTable 
                                    stakeLamports={wager * LAMPORTS_PER_SOL} 
                                    onResult={handleGameResult}
                                />
                            ) : (
                                <div className="text-center mt-4">
                                    <p>Please connect your wallet to play</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="row justify-content-center mt-4 mb-3">
                <div className="col-md-12">
                    <div className="bg-half-transparent sr-border text-white">
                        <div className="card-header text-center">
                            RESULTS
                        </div>
                        <div className="card-body">
                            <div>{results}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
