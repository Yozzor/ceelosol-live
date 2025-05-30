import React, { useState, useEffect } from 'react';
import { WalletAccessControl } from './WalletAccessControl';
import { generateWallet } from '../lib/walletGen';
import { initializeTestWhitelist, emergencyRecoverAllWallets } from '../lib/whitelist';
import { emergencyRecoverAllWalletData } from '../lib/walletPersistence';
import { useAuth } from '../util/auth';
import './WalletModal.css';

interface AppAccessManagerProps {
  children: React.ReactNode;
}

type AccessState = 'checking' | 'access_control' | 'wallet_generation' | 'granted';

export const AppAccessManager: React.FC<AppAccessManagerProps> = ({ children }) => {
  const [accessState, setAccessState] = useState<AccessState>('checking');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [authorizedWallet, setAuthorizedWallet] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<{ publicKey: string; secretBase58: string; secretArray: number[]; safeWord: string } | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmationSliderValue, setConfirmationSliderValue] = useState(0);
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
    setShowConfirmationDialog(true);
  };

  const handleConfirmationClose = () => {
    setShowConfirmationDialog(false);
    setConfirmationSliderValue(0);
  };

  const handleConfirmationConfirm = () => {
    setShowWalletModal(false);
    setShowConfirmationDialog(false);
    setConfirmationSliderValue(0);
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
        <div
          className="min-vh-100 d-flex align-items-center justify-content-center"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
            backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(54, 104, 44, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(144, 98, 16, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(180, 25, 29, 0.2) 0%, transparent 50%)
            `,
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-6 col-lg-5">
                <div
                  className="card border-0"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(15px)',
                    borderRadius: '20px',
                    border: '2px solid var(--sa-green)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
                  }}
                >
                  <div
                    className="card-header text-center border-0"
                    style={{
                      backgroundColor: 'var(--sa-green)',
                      borderRadius: '18px 18px 0 0',
                      padding: '20px'
                    }}
                  >
                    <h3
                      className="mb-0 text-white"
                      style={{
                        fontFamily: 'Pricedown, sans-serif',
                        fontSize: '2rem',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                      }}
                    >
                      🎲 Generate New Wallet
                    </h3>
                  </div>
                  <div className="card-body text-white p-5">
                    <div className="text-center mb-4">
                      <img
                        src="/assets/ceelosologo.png"
                        alt="CeeloSol"
                        style={{ height: '80px', marginBottom: '20px' }}
                      />
                      <p
                        className="mb-4"
                        style={{
                          color: 'var(--sa-gold)',
                          fontSize: '1.2rem',
                          fontWeight: 'bold'
                        }}
                      >
                        Create a new wallet to access CeeloSol
                      </p>
                    </div>

                    <div
                      className="alert mb-4"
                      style={{
                        backgroundColor: 'rgba(255, 193, 7, 0.2)',
                        border: '1px solid var(--sa-gold)',
                        borderRadius: '12px',
                        color: '#ffc107'
                      }}
                    >
                      <h6
                        className="alert-heading"
                        style={{
                          color: 'var(--sa-gold)',
                          fontFamily: 'Pricedown, sans-serif'
                        }}
                      >
                        🔐 Wallet Generation
                      </h6>
                      <p className="mb-0">
                        We'll generate a secure Solana wallet for you. This wallet will be automatically
                        authorized to access CeeloSol. Make sure to save your private keys!
                      </p>
                    </div>

                    <div className="d-grid gap-2">
                      <button
                        className="btn w-100"
                        onClick={handleGenerateWallet}
                        style={{
                          backgroundColor: 'var(--sa-green)',
                          border: '2px solid var(--sa-green)',
                          color: '#ffffff',
                          borderRadius: '12px',
                          fontSize: '1.3rem',
                          padding: '15px',
                          fontFamily: 'Pricedown, sans-serif',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          transition: 'all 0.3s ease',
                          fontWeight: 'bold'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = 'var(--sa-gold)';
                          target.style.borderColor = 'var(--sa-gold)';
                          target.style.transform = 'translateY(-2px)';
                          target.style.boxShadow = '0 8px 25px rgba(144, 98, 16, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = 'var(--sa-green)';
                          target.style.borderColor = 'var(--sa-green)';
                          target.style.transform = 'translateY(0)';
                          target.style.boxShadow = 'none';
                        }}
                      >
                        Generate New Wallet
                      </button>
                    </div>

                    <div
                      className="mt-4 pt-3 text-center"
                      style={{
                        borderTop: '1px solid var(--sa-green)',
                        borderRadius: '8px'
                      }}
                    >
                      <button
                        className="btn btn-sm"
                        onClick={() => setAccessState('access_control')}
                        style={{
                          backgroundColor: 'rgba(144, 98, 16, 0.2)',
                          border: '2px solid var(--sa-gold)',
                          color: 'var(--sa-gold)',
                          borderRadius: '8px',
                          padding: '8px 20px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = 'var(--sa-gold)';
                          target.style.color = '#000';
                          target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = 'rgba(144, 98, 16, 0.2)';
                          target.style.color = 'var(--sa-gold)';
                          target.style.transform = 'translateY(0)';
                        }}
                      >
                        ← Back to Access Control
                      </button>
                    </div>

                    <div className="mt-3 text-center">
                      <small
                        className="text-muted"
                        style={{
                          fontSize: '0.85rem',
                          opacity: 0.8
                        }}
                      >
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
          <div
            className="modal wallet-modal-overlay"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.95)',
              backdropFilter: 'blur(10px)',
              zIndex: 1050
            }}
          >
            <div
              className="modal-dialog modal-lg wallet-modal-dialog"
              style={{
                margin: 0,
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh'
              }}
            >
              <div
                className="modal-content border-0 wallet-modal-content"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.95)',
                  backdropFilter: 'blur(15px)',
                  borderRadius: '20px',
                  border: '2px solid var(--sa-green)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '100%',
                  overflow: 'hidden'
                }}
              >
                <div
                  className="modal-header border-0 wallet-modal-header"
                  style={{
                    backgroundColor: 'var(--sa-green)',
                    borderRadius: '18px 18px 0 0',
                    padding: '20px'
                  }}
                >
                  <h5
                    className="modal-title text-white"
                    style={{
                      fontFamily: 'Pricedown, sans-serif',
                      fontSize: '1.8rem',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    🎉 Your New Wallet Created!
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '1.5rem',
                      color: '#ffffff',
                      opacity: 0.8
                    }}
                    onClick={handleWalletModalClose}
                  >
                    ×
                  </button>
                </div>
                <div
                  className="modal-body p-4 text-white wallet-modal-body"
                  style={{
                    overflowY: 'auto',
                    flexGrow: 1,
                    maxHeight: 'calc(90vh - 200px)'
                  }}
                >
                  <div
                    className="alert mb-4"
                    style={{
                      backgroundColor: 'rgba(255, 193, 7, 0.2)',
                      border: '1px solid var(--sa-gold)',
                      borderRadius: '12px',
                      color: '#ffc107'
                    }}
                  >
                    <strong>⚠️ Important:</strong> Save your wallet information! If you lose this, you won't be able to recover your funds.
                  </div>

                  <div className="form-group mb-4">
                    <label
                      className="mb-2"
                      style={{
                        color: 'var(--sa-gold)',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}
                    >
                      Your Wallet Address:
                    </label>
                    <input
                      type="text"
                      className="form-control text-white"
                      value={walletInfo.publicKey}
                      readOnly
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '2px solid var(--sa-gold)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        padding: '12px'
                      }}
                    />
                    <small className="text-muted mt-1 d-block">This is your public wallet address - use this to access CeeloSol</small>
                  </div>

                  <div className="form-group mb-4">
                    <label
                      className="mb-2"
                      style={{
                        color: 'var(--sa-gold)',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}
                    >
                      Private Key - Base58 Format (for Phantom wallet):
                    </label>
                    <textarea
                      className="form-control text-white"
                      value={walletInfo.secretBase58}
                      readOnly
                      rows={3}
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '2px solid var(--sa-gold)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        padding: '12px',
                        resize: 'vertical'
                      }}
                    />
                    <small className="text-muted mt-1 d-block">Copy this to import into Phantom wallet</small>
                  </div>

                  <div className="form-group mb-4">
                    <label
                      className="mb-2"
                      style={{
                        color: 'var(--sa-green)',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}
                    >
                      🔒 Safe Word (for additional security):
                    </label>
                    <input
                      type="text"
                      className="form-control text-white"
                      value={walletInfo.safeWord}
                      readOnly
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '2px solid var(--sa-green)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        padding: '12px'
                      }}
                    />
                    <small className="text-muted mt-1 d-block">Remember this safe word - you'll need it to access your wallet</small>
                  </div>

                  <div
                    className="alert"
                    style={{
                      backgroundColor: 'rgba(54, 104, 44, 0.2)',
                      border: '1px solid var(--sa-green)',
                      borderRadius: '12px',
                      color: 'var(--sa-green)'
                    }}
                  >
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
                <div
                  className="modal-footer border-0 p-4 wallet-modal-footer"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    flexShrink: 0,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    justifyContent: 'center'
                  }}
                >
                  <button
                    className="btn"
                    onClick={() => navigator.clipboard.writeText(walletInfo.publicKey)}
                    style={{
                      backgroundColor: 'rgba(144, 98, 16, 0.3)',
                      border: '2px solid var(--sa-gold)',
                      color: 'var(--sa-gold)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      minWidth: '120px'
                    }}
                  >
                    Copy Address
                  </button>
                  <button
                    className="btn"
                    onClick={() => navigator.clipboard.writeText(walletInfo.secretBase58)}
                    style={{
                      backgroundColor: 'rgba(144, 98, 16, 0.3)',
                      border: '2px solid var(--sa-gold)',
                      color: 'var(--sa-gold)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      minWidth: '120px'
                    }}
                  >
                    Copy Key
                  </button>
                  <button
                    className="btn"
                    onClick={() => navigator.clipboard.writeText(walletInfo.safeWord)}
                    style={{
                      backgroundColor: 'rgba(54, 104, 44, 0.3)',
                      border: '2px solid var(--sa-green)',
                      color: 'var(--sa-green)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      minWidth: '120px'
                    }}
                  >
                    Copy Safe Word
                  </button>
                  <button
                    className="btn"
                    onClick={handleWalletModalClose}
                    style={{
                      backgroundColor: 'var(--sa-green)',
                      border: '2px solid var(--sa-green)',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontWeight: 'bold',
                      fontFamily: 'Pricedown, sans-serif',
                      fontSize: '1rem',
                      minWidth: '140px'
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmationDialog && (
          <div
            className="modal"
            style={{
              display: 'block',
              backgroundColor: 'rgba(0,0,0,0.98)',
              backdropFilter: 'blur(15px)',
              zIndex: 1060
            }}
          >
            <div className="modal-dialog modal-md">
              <div
                className="modal-content border-0"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.95)',
                  backdropFilter: 'blur(15px)',
                  borderRadius: '20px',
                  border: '2px solid var(--sa-red)',
                  boxShadow: '0 20px 40px rgba(180, 25, 29, 0.8)'
                }}
              >
                <div
                  className="modal-header border-0"
                  style={{
                    backgroundColor: 'var(--sa-red)',
                    borderRadius: '18px 18px 0 0',
                    padding: '20px'
                  }}
                >
                  <h5
                    className="modal-title text-white"
                    style={{
                      fontFamily: 'Pricedown, sans-serif',
                      fontSize: '1.8rem',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                    }}
                  >
                    ⚠️ SECURITY CONFIRMATION
                  </h5>
                </div>
                <div className="modal-body p-4 text-white">
                  <div
                    className="alert mb-4"
                    style={{
                      backgroundColor: 'rgba(180, 25, 29, 0.2)',
                      border: '1px solid var(--sa-red)',
                      borderRadius: '12px',
                      color: '#ff6b6b'
                    }}
                  >
                    <strong>🚨 CRITICAL:</strong> Did you copy your wallet address and private keys? If you lose this information, you won't be able to recover your funds!
                  </div>

                  <div className="mb-4">
                    <p className="text-center mb-3" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      Confirm you have saved ALL wallet information:
                    </p>
                    <ul className="list-unstyled">
                      <li className="mb-2">✅ Wallet Address</li>
                      <li className="mb-2">✅ Private Key (Base58)</li>
                      <li className="mb-2">✅ Safe Word</li>
                    </ul>
                  </div>

                  <div className="mb-4">
                    <label
                      className="mb-3 d-block text-center"
                      style={{
                        color: 'var(--sa-gold)',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}
                    >
                      Slide to confirm you've saved everything:
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="100"
                      value={confirmationSliderValue}
                      onChange={(e) => setConfirmationSliderValue(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '8px',
                        background: `linear-gradient(to right, var(--sa-green) 0%, var(--sa-green) ${confirmationSliderValue}%, #333 ${confirmationSliderValue}%, #333 100%)`,
                        borderRadius: '5px',
                        outline: 'none'
                      }}
                    />
                    <div className="text-center mt-2">
                      <span
                        style={{
                          color: confirmationSliderValue === 100 ? 'var(--sa-green)' : 'var(--sa-gold)',
                          fontWeight: 'bold'
                        }}
                      >
                        {confirmationSliderValue}% - {confirmationSliderValue === 100 ? 'CONFIRMED!' : 'Slide to 100%'}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className="modal-footer border-0 p-4"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                >
                  <button
                    className="btn me-3"
                    onClick={handleConfirmationClose}
                    style={{
                      backgroundColor: 'rgba(108, 117, 125, 0.3)',
                      border: '2px solid #6c757d',
                      color: '#6c757d',
                      borderRadius: '8px',
                      padding: '8px 20px',
                      fontWeight: 'bold'
                    }}
                  >
                    Go Back
                  </button>
                  <button
                    className="btn"
                    onClick={handleConfirmationConfirm}
                    disabled={confirmationSliderValue !== 100}
                    style={{
                      backgroundColor: confirmationSliderValue === 100 ? 'var(--sa-green)' : 'rgba(54, 104, 44, 0.3)',
                      border: `2px solid ${confirmationSliderValue === 100 ? 'var(--sa-green)' : 'rgba(54, 104, 44, 0.5)'}`,
                      color: confirmationSliderValue === 100 ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '8px',
                      padding: '8px 20px',
                      fontWeight: 'bold',
                      fontFamily: 'Pricedown, sans-serif',
                      cursor: confirmationSliderValue === 100 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {confirmationSliderValue === 100 ? 'YES, I SAVED EVERYTHING' : 'SLIDE TO CONFIRM'}
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
