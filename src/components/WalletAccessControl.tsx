import React, { useState } from 'react';
import { isWhitelisted, updateLastAccessed } from '../lib/whitelist';
import { useAuth } from '../util/auth';

interface WalletAccessControlProps {
  onAccessGranted: (walletAddress: string) => void;
  onAccessDenied: () => void;
}

export const WalletAccessControl: React.FC<WalletAccessControlProps> = ({
  onAccessGranted,
  onAccessDenied,
}) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreError, setRestoreError] = useState('');

  // Check if user has any whitelisted wallets
  const getWhitelistStatus = () => {
    try {
      const currentWhitelist = localStorage.getItem('ceelo_whitelist');
      if (!currentWhitelist) return { count: 0, hasWallets: false };
      const parsed = JSON.parse(currentWhitelist);
      return { count: parsed.length, hasWallets: parsed.length > 0 };
    } catch {
      return { count: 0, hasWallets: false };
    }
  };

  const whitelistStatus = getWhitelistStatus();
  const { restore } = useAuth();

  const validateSolanaAddress = (address: string): boolean => {
    // Basic Solana address validation
    // Solana addresses are Base58 encoded and typically 32-44 characters
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      const trimmedAddress = walletAddress.trim();

      // Validate address format
      if (!trimmedAddress) {
        setError('Please enter a wallet address');
        setIsChecking(false);
        return;
      }

      if (!validateSolanaAddress(trimmedAddress)) {
        setError('Invalid Solana wallet address format');
        setIsChecking(false);
        return;
      }

      // Debug: Check whitelist status
      console.log('🔍 Checking whitelist for address:', trimmedAddress);
      const currentWhitelist = localStorage.getItem('ceelo_whitelist');
      console.log('🔍 Current whitelist in localStorage:', currentWhitelist);

      // Check if whitelisted
      const isAllowed = isWhitelisted(trimmedAddress);
      console.log('🔍 isWhitelisted result:', isAllowed);

      if (isAllowed) {
        // Update last accessed time
        updateLastAccessed(trimmedAddress);
        onAccessGranted(trimmedAddress);
      } else {
        // Check if we have any whitelisted wallets at all
        const currentWhitelist = localStorage.getItem('ceelo_whitelist');
        const hasWhitelist = currentWhitelist && JSON.parse(currentWhitelist).length > 0;

        if (hasWhitelist) {
          setError('This wallet address is not authorized. Please check your address or try a different wallet.');
        } else {
          setError('No whitelisted wallets found. Please generate a new wallet or migrate from the previous version.');
        }
        onAccessDenied();
      }
    } catch (error) {
      console.error('Error checking wallet access:', error);
      setError('An error occurred while checking your wallet. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };



  const handleRestoreWallet = async () => {
    if (!privateKey.trim()) {
      setRestoreStatus('error');
      setRestoreError('Please enter a private key');
      return;
    }

    setRestoreStatus('loading');
    setRestoreError('');

    try {
      const success = await restore(privateKey);
      if (success) {
        setRestoreStatus('success');
        // Close modal after a short delay and redirect to access granted
        setTimeout(() => {
          setShowRestoreModal(false);
          // The restore function should have set the wallet in localStorage
          // We need to get the public key and grant access
          const restoredPublicKey = localStorage.getItem('ceelo_pub');
          if (restoredPublicKey) {
            onAccessGranted(restoredPublicKey);
          }
        }, 1500);
      } else {
        setRestoreStatus('error');
        setRestoreError('Invalid private key format or failed to restore wallet');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      setRestoreStatus('error');
      setRestoreError('Failed to restore wallet. Please check your private key.');
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundImage: 'url(/assets/ceelobg1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative'
      }}
    >
      {/* Dark overlay for better text readability */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div
              className="card border-0 shadow-lg"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: '15px',
                border: '2px solid var(--sa-green)'
              }}
            >
              <div className="card-body p-5 text-white">
                {/* Logo and Title */}
                <div className="text-center mb-4">
                  <img
                    src="/assets/ceelosologo.png"
                    alt="CeeloSol"
                    style={{ height: '80px', marginBottom: '20px' }}
                  />
                  <h2
                    className="mb-3"
                    style={{
                      fontFamily: 'Pricedown, sans-serif',
                      color: 'var(--sa-green)',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      fontSize: '2.5rem'
                    }}
                  >
                    WALLET ACCESS
                  </h2>
                  <p className="text-warning mb-4" style={{ fontSize: '1.1rem' }}>
                    Enter your authorized wallet address to access the game
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group mb-4">
                    <label
                      htmlFor="walletAddress"
                      className="form-label mb-2"
                      style={{
                        color: 'var(--sa-green)',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}
                    >
                      Wallet Address:
                    </label>
                    <input
                      type="text"
                      id="walletAddress"
                      className="form-control text-white"
                      placeholder="Enter your Solana wallet address..."
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      disabled={isChecking}
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '2px solid var(--sa-green)',
                        borderRadius: '8px',
                        fontSize: '16px',
                        padding: '12px 16px',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--sa-gold)';
                        e.target.style.boxShadow = '0 0 10px rgba(144, 98, 16, 0.3)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--sa-green)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {error && (
                    <div
                      className="alert mb-4"
                      style={{
                        backgroundColor: 'rgba(180, 25, 29, 0.2)',
                        border: '1px solid var(--sa-red)',
                        borderRadius: '8px',
                        color: '#ff6b6b'
                      }}
                    >
                      <small>{error}</small>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn w-100 text-dark font-weight-bold"
                    disabled={isChecking || !walletAddress.trim()}
                    style={{
                      backgroundColor: 'var(--sa-green)',
                      border: '2px solid var(--sa-green)',
                      borderRadius: '8px',
                      fontSize: '1.2rem',
                      padding: '12px',
                      fontFamily: 'Pricedown, sans-serif',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecking && walletAddress.trim()) {
                        const target = e.target as HTMLButtonElement;
                        target.style.backgroundColor = 'var(--sa-gold)';
                        target.style.borderColor = 'var(--sa-gold)';
                        target.style.transform = 'translateY(-2px)';
                        target.style.boxShadow = '0 4px 15px rgba(144, 98, 16, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = 'var(--sa-green)';
                      target.style.borderColor = 'var(--sa-green)';
                      target.style.transform = 'translateY(0)';
                      target.style.boxShadow = 'none';
                    }}
                  >
                    {isChecking ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        CHECKING ACCESS...
                      </>
                    ) : (
                      'ACCESS GAME'
                    )}
                  </button>
                </form>

                <div
                  className="mt-5 pt-4"
                  style={{
                    borderTop: '1px solid var(--sa-green)',
                    borderRadius: '8px'
                  }}
                >
                  <h6
                    className="mb-3 text-center"
                    style={{
                      color: 'var(--sa-gold)',
                      fontFamily: 'Pricedown, sans-serif',
                      fontSize: '1.3rem',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    DON'T HAVE ACCESS?
                  </h6>
                  <p className="text-center text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                    Only wallets generated through our app can access CeeloSol
                  </p>
                  <div className="row g-3">
                    <div className="col-6">
                      <button
                        className="btn w-100"
                        onClick={() => {
                          // This will trigger the wallet generation flow
                          onAccessDenied();
                        }}
                        style={{
                          backgroundColor: 'rgba(54, 104, 44, 0.2)',
                          border: '2px solid var(--sa-green)',
                          color: 'var(--sa-green)',
                          borderRadius: '8px',
                          padding: '10px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = 'var(--sa-green)';
                          target.style.color = '#000';
                          target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = 'rgba(54, 104, 44, 0.2)';
                          target.style.color = 'var(--sa-green)';
                          target.style.transform = 'translateY(0)';
                        }}
                      >
                        🎲 Generate New
                      </button>
                    </div>
                    <div className="col-6">
                      <button
                        className="btn w-100"
                        onClick={() => setShowRestoreModal(true)}
                        style={{
                          backgroundColor: 'rgba(144, 98, 16, 0.2)',
                          border: '2px solid var(--sa-gold)',
                          color: 'var(--sa-gold)',
                          borderRadius: '8px',
                          padding: '10px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = 'var(--sa-gold)';
                          target.style.color = '#000';
                          target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.backgroundColor = 'rgba(144, 98, 16, 0.2)';
                          target.style.color = 'var(--sa-gold)';
                          target.style.transform = 'translateY(0)';
                        }}
                      >
                        🔑 Restore Wallet
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
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

      {/* Restore Wallet Modal */}
      {showRestoreModal && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <div className="modal-dialog modal-lg">
            <div
              className="modal-content border-0"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '15px',
                border: '2px solid var(--sa-gold)'
              }}
            >
              <div
                className="modal-header border-0"
                style={{
                  backgroundColor: 'var(--sa-gold)',
                  borderRadius: '13px 13px 0 0'
                }}
              >
                <h5
                  className="modal-title text-dark"
                  style={{
                    fontFamily: 'Pricedown, sans-serif',
                    fontSize: '1.5rem',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                  }}
                >
                  🔑 RESTORE YOUR WALLET
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#000',
                    opacity: 0.8
                  }}
                  onClick={() => {
                    setShowRestoreModal(false);
                    setPrivateKey('');
                    setRestoreStatus('idle');
                    setRestoreError('');
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body p-4 text-white">
                <div
                  className="alert mb-4"
                  style={{
                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                    border: '1px solid var(--sa-gold)',
                    borderRadius: '8px',
                    color: '#ffc107'
                  }}
                >
                  <strong>⚠️ Security Notice:</strong> Only enter your private key on trusted devices. Never share your private key with anyone.
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
                    Private Key:
                  </label>
                  <textarea
                    className="form-control text-white"
                    placeholder="Enter your private key (Base58 format or JSON array)..."
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    rows={4}
                    disabled={restoreStatus === 'loading'}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      border: '2px solid var(--sa-gold)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      padding: '12px',
                      resize: 'vertical'
                    }}
                  />
                  <small className="text-muted mt-1 d-block">
                    Supports Base58 format (from Phantom) or JSON array format
                  </small>
                </div>

                {restoreError && (
                  <div
                    className="alert mb-3"
                    style={{
                      backgroundColor: 'rgba(180, 25, 29, 0.2)',
                      border: '1px solid var(--sa-red)',
                      borderRadius: '8px',
                      color: '#ff6b6b'
                    }}
                  >
                    {restoreError}
                  </div>
                )}

                {restoreStatus === 'success' && (
                  <div
                    className="alert mb-3"
                    style={{
                      backgroundColor: 'rgba(54, 104, 44, 0.2)',
                      border: '1px solid var(--sa-green)',
                      borderRadius: '8px',
                      color: 'var(--sa-green)'
                    }}
                  >
                    ✅ Wallet restored successfully! Redirecting to game...
                  </div>
                )}
              </div>
              <div
                className="modal-footer border-0 p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              >
                <button
                  className="btn me-3"
                  onClick={() => {
                    setShowRestoreModal(false);
                    setPrivateKey('');
                    setRestoreStatus('idle');
                    setRestoreError('');
                  }}
                  disabled={restoreStatus === 'loading'}
                  style={{
                    backgroundColor: 'rgba(108, 117, 125, 0.3)',
                    border: '2px solid #6c757d',
                    color: '#6c757d',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={handleRestoreWallet}
                  disabled={restoreStatus === 'loading' || !privateKey.trim()}
                  style={{
                    backgroundColor: 'var(--sa-gold)',
                    border: '2px solid var(--sa-gold)',
                    color: '#000',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontWeight: 'bold',
                    fontFamily: 'Pricedown, sans-serif'
                  }}
                >
                  {restoreStatus === 'loading' ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      RESTORING...
                    </>
                  ) : (
                    'RESTORE WALLET'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
