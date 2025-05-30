import React, { useState, useEffect } from 'react';
import { WalletAccessControl } from './WalletAccessControl';
import { generateWallet } from '../lib/walletGen';
import { initializeTestWhitelist, emergencyRecoverAllWallets } from '../lib/whitelist';
import { emergencyRecoverAllWalletData } from '../lib/walletPersistence';
import { useAuth } from '../util/auth';

interface AppAccessManagerProps {
  children: React.ReactNode;
}

type AccessState = 'checking' | 'access_control' | 'wallet_generation' | 'granted';

export const AppAccessManager: React.FC<AppAccessManagerProps> = ({ children }) => {
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [authorizedWallet, setAuthorizedWallet] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<{ publicKey: string; secretBase58: string; secretArray: number[]; safeWord: string } | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { initializeFromSession } = useAuth();

  useEffect(() => {
    console.log('🚀 Initializing CeeloSol with MAXIMUM WALLET PROTECTION...');

    // Initialize test whitelist for development
    initializeTestWhitelist();

    // EMERGENCY RECOVERY: Ensure NO wallet is ever lost
    console.log('🔍 Running comprehensive wallet recovery...');
    const recoveredWhitelistWallets = emergencyRecoverAllWallets();
    const recoveredWalletData = emergencyRecoverAllWalletData();

    if (recoveredWhitelistWallets.length > 0) {
      console.log(`✅ Recovered ${recoveredWhitelistWallets.length} wallets from whitelist`);
    }

    if (recoveredWalletData.length > 0) {
      console.log(`✅ Recovered ${recoveredWalletData.length} wallet data entries`);
    }

    // Check if user already has an authorized session
    const sessionWallet = sessionStorage.getItem('ceelo_authorized_wallet');
    if (sessionWallet) {
      setAuthorizedWallet(sessionWallet);
      setAccessState('granted');
    } else {
      setAccessState('access_control');
    }

    console.log('🛡️ Wallet protection system fully initialized');
  }, []);

  const handleAccessGranted = (walletAddress: string) => {
    setAuthorizedWallet(walletAddress);
    // Store in session storage so they don't need to re-enter during this session
    sessionStorage.setItem('ceelo_authorized_wallet', walletAddress);

    // Initialize the auth context with the session wallet
    console.log('🔄 Triggering auth initialization after access granted...');
    initializeFromSession();

    setAccessState('granted');
  };

  const handleAccessDenied = () => {
    setAccessState('wallet_generation');
  };

  const handleGenerateWallet = async () => {
    try {
      const wallet = await generateWallet();
      setWalletInfo({
        publicKey: wallet.publicKey,
        secretBase58: wallet.secretBase58,
        secretArray: wallet.secretArray,
        safeWord: wallet.safeWord
      });
      setShowWalletModal(true);
    } catch (error) {
      console.error('Failed to generate wallet:', error);
      alert('Failed to generate wallet. Please try again.');
    }
  };

  const handleWalletModalClose = () => {
    setShowWalletModal(false);
    // After wallet generation, go back to access control
    // The user will need to enter their new wallet address
    setAccessState('access_control');
  };

  // Loading state
  if (accessState === 'checking') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
        <div className="text-center text-white">
          <div className="spinner-border text-warning mb-3" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>Checking access...</p>
        </div>
      </div>
    );
  }

  // Wallet address input screen
  if (accessState === 'access_control') {
    return (
      <WalletAccessControl
        onAccessGranted={handleAccessGranted}
        onAccessDenied={handleAccessDenied}
      />
    );
  }

  // Wallet generation screen
  if (accessState === 'wallet_generation') {
    return (
      <>
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-6 col-lg-5">
                <div className="card bg-dark border-success">
                  <div className="card-header text-center bg-success text-dark">
                    <h3 className="mb-0 font-weight-bold">🎲 Generate New Wallet</h3>
                  </div>
                  <div className="card-body text-white">
                    <div className="text-center mb-4">
                      <img
                        src="/assets/ceelosol-graffiti.svg"
                        alt="CeeloSol"
                        height="60"
                        className="mb-3"
                      />
                      <p className="text-success">
                        Create a new wallet to access CeeloSol
                      </p>
                    </div>

                    <div className="alert alert-info">
                      <h6 className="alert-heading">🔐 Wallet Generation</h6>
                      <p className="mb-0">
                        We'll generate a secure Solana wallet for you. This wallet will be automatically
                        authorized to access CeeloSol. Make sure to save your private keys!
                      </p>
                    </div>

                    <div className="d-grid gap-2">
                      <button
                        className="btn btn-success w-100"
                        onClick={handleGenerateWallet}
                      >
                        Generate New Wallet
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-top border-secondary text-center">
                      <button
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => setAccessState('access_control')}
                      >
                        ← Back to Access Control
                      </button>
                    </div>

                    <div className="mt-3 text-center">
                      <small className="text-muted">
                        🔒 Secure • 🎮 Exclusive • 🚀 Powered by Solana
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Information Modal */}
        {showWalletModal && walletInfo && (
          <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content bg-dark text-white">
                <div className="modal-header bg-success text-dark">
                  <h5 className="modal-title">🎉 Your New Wallet Created!</h5>
                  <button type="button" className="close text-dark" onClick={handleWalletModalClose}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <strong>⚠️ Important:</strong> Save your wallet information! If you lose this, you won't be able to recover your funds.
                  </div>

                  <div className="form-group">
                    <label className="text-warning">Your Wallet Address:</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-white border-warning"
                      value={walletInfo.publicKey}
                      readOnly
                    />
                    <small className="text-muted">This is your public wallet address - use this to access CeeloSol</small>
                  </div>

                  <div className="form-group mt-3">
                    <label className="text-warning">Private Key - Base58 Format (for Phantom wallet):</label>
                    <textarea
                      className="form-control bg-dark text-white border-warning"
                      value={walletInfo.secretBase58}
                      readOnly
                      rows={3}
                    />
                    <small className="text-muted">Copy this to import into Phantom wallet</small>
                  </div>

                  <div className="form-group mt-3">
                    <label className="text-success">🔒 Safe Word (for additional security):</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-white border-success"
                      value={walletInfo.safeWord}
                      readOnly
                    />
                    <small className="text-muted">Remember this safe word - you'll need it to access your wallet</small>
                  </div>

                  <div className="alert alert-info mt-3">
                    <p className="mb-0">
                      <strong>Next Steps:</strong><br />
                      1. Copy your wallet address above<br />
                      2. Save your private key securely<br />
                      3. <strong>Remember your safe word</strong> - you'll need it for authentication<br />
                      4. Click "Continue" and enter your wallet address to access CeeloSol<br />
                      5. Optional: Import the Base58 key into Phantom wallet
                    </p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigator.clipboard.writeText(walletInfo.publicKey)}
                  >
                    Copy Wallet Address
                  </button>
                  <button
                    className="btn btn-warning"
                    onClick={() => navigator.clipboard.writeText(walletInfo.secretBase58)}
                  >
                    Copy Private Key
                  </button>
                  <button
                    className="btn btn-info"
                    onClick={() => navigator.clipboard.writeText(walletInfo.safeWord)}
                  >
                    Copy Safe Word
                  </button>
                  <button className="btn btn-success" onClick={handleWalletModalClose}>
                    Continue to Access Control
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Access granted - show the main app
  return <>{children}</>;
};
