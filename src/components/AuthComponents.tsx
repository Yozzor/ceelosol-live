import React, { useState, useEffect } from 'react';
import { useAuth } from '../util/auth';
import { downloadKeyJSON } from '../lib/walletGen';

// Login Component
export const LoginButton: React.FC = () => {
  const { login, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    await login();
  };

  return (
    <button
      className="btn btn-primary w-100"
      onClick={handleLogin}
      disabled={isAuthenticated}
    >
      Login with Existing Wallet
    </button>
  );
};

// Register Component
export const RegisterButton: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [walletInfo, setWalletInfo] = useState({ publicKey: '', secretBase58: '', secretArray: [] as number[] });
  const [copied, setCopied] = useState(false);

  const handleRegister = async () => {
    try {
      const wallet = await register();
      setWalletInfo({
        publicKey: wallet.publicKey,
        secretBase58: wallet.secretBase58,
        secretArray: wallet.secretArray
      });
      setShowModal(true);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(walletInfo.secretBase58)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy:', err));
  };

  const handleDownloadJson = () => {
    downloadKeyJSON(walletInfo.secretArray);
  };

  return (
    <>
      <button
        className="btn btn-success w-100"
        onClick={handleRegister}
        disabled={isAuthenticated}
      >
        Register New Wallet
      </button>

      {showModal && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Your New Wallet</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <strong>Important:</strong> Save your wallet information! If you lose this, you won't be able to recover your funds.
                </div>
                <div className="form-group">
                  <label>Your Wallet Address:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={walletInfo.publicKey}
                    readOnly
                  />
                </div>
                <div className="form-group mt-3">
                  <label>Private key (Base58 – paste into Phantom):</label>
                  <textarea
                    className="form-control"
                    value={walletInfo.secretBase58}
                    readOnly
                    rows={3}
                  />
                </div>
                <div className="alert alert-info mt-3">
                  <p className="mb-0">
                    <strong>How to use this wallet:</strong><br />
                    1. Copy the Base58 private key above<br />
                    2. Open Phantom → Settings → Add / Connect Wallet → Import Private Key<br />
                    3. Paste the Base58 key to import your wallet into Phantom<br />
                    4. Download the JSON backup for additional security
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Close
                </button>
                <button className="btn btn-primary" onClick={handleCopyToClipboard}>
                  {copied ? 'Copied!' : 'Copy Base58 Key'}
                </button>
                <button className="btn btn-success" onClick={handleDownloadJson}>
                  Download JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper functions for private key format detection and conversion
const isJsonArrayFormat = (key: string): boolean => {
  try {
    const parsed = JSON.parse(key);
    return Array.isArray(parsed) && parsed.length === 64;
  } catch {
    return false;
  }
};

const isBase58Format = (key: string): boolean => {
  // Base58 strings are typically 87-88 characters for Solana private keys
  return typeof key === 'string' && key.length >= 80 && key.length <= 90 && !/[^123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]/.test(key);
};

const getSecretArrayFromPrivateKey = async (privateKey: string): Promise<number[] | null> => {
  if (!privateKey) return null;

  if (isJsonArrayFormat(privateKey)) {
    try {
      return JSON.parse(privateKey);
    } catch {
      return null;
    }
  }

  if (isBase58Format(privateKey)) {
    try {
      const bs58 = await import('bs58');
      const decoded = bs58.default.decode(privateKey);

      // Handle both 32-byte and 64-byte Base58 keys
      if (decoded.length === 32) {
        // This is a 32-byte private key, reconstruct the full 64-byte key
        const { Keypair } = await import('@solana/web3.js');
        const tempKeypair = Keypair.fromSecretKey(decoded);
        return Array.from(tempKeypair.secretKey);
      } else if (decoded.length === 64) {
        // This is already a full 64-byte secret key
        return Array.from(decoded);
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  return null;
};

// Auth Status Component
// Restore Wallet Button Component
export const RestoreWalletButton: React.FC = () => {
  const { restore, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRestore = async () => {
    if (!privateKey.trim()) {
      setRestoreStatus('error');
      setErrorMessage('Please enter a private key');
      return;
    }

    setRestoreStatus('loading');
    try {
      const success = await restore(privateKey);
      if (success) {
        setRestoreStatus('success');
        setTimeout(() => setShowModal(false), 2000);
      } else {
        setRestoreStatus('error');
        setErrorMessage('Invalid private key format');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      setRestoreStatus('error');
      setErrorMessage('Failed to restore wallet');
    }
  };

  return (
    <>
      <button
        className="btn btn-info w-100"
        onClick={() => setShowModal(true)}
        disabled={isAuthenticated}
      >
        Restore Wallet
      </button>

      {showModal && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Restore Your Wallet</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>Restore Access:</strong> Enter your private key to restore access to your wallet.
                </div>
                <div className="form-group">
                  <label>Your Private Key:</label>
                  <textarea
                    className="form-control"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    rows={3}
                    placeholder="Paste your private key here (Base58 format or array format)"
                  />
                </div>
                {restoreStatus === 'error' && (
                  <div className="alert alert-danger mt-2">
                    {errorMessage}
                  </div>
                )}
                {restoreStatus === 'success' && (
                  <div className="alert alert-success mt-2">
                    Wallet restored successfully!
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleRestore}
                  disabled={restoreStatus === 'loading'}
                >
                  {restoreStatus === 'loading' ? 'Restoring...' : 'Restore Wallet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const AuthStatus: React.FC = () => {
  const { isAuthenticated, publicKey, privateKey, logout } = useAuth();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [base58Key, setBase58Key] = useState<string>('');

  // Load Base58 key when component mounts or when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const storedBase58 = localStorage.getItem('ceelo_priv_b58');

      // Check if the stored Base58 key is the old short format (44 chars) vs full format (88 chars)
      if (storedBase58 && storedBase58.length < 80) {
        // This is the old short format, clear it and regenerate
        localStorage.removeItem('ceelo_priv_b58');
        console.log('Cleared old short Base58 key, will regenerate full key');
      }

      if (storedBase58 && storedBase58.length >= 80) {
        // This is the correct full-length Base58 key
        setBase58Key(storedBase58);
      } else {
        // If no Base58 key stored, try to generate it from the array format
        const storedArray = localStorage.getItem('ceelo_priv_arr');
        if (storedArray) {
          try {
            const secretArray = JSON.parse(storedArray);
            if (Array.isArray(secretArray) && secretArray.length === 64) {
              // Convert array to Base58 for Phantom
              import('bs58').then(bs58 => {
                // For Phantom, we need the FULL 64-byte secret key
                const fullSecretKey = new Uint8Array(secretArray);
                const base58String = bs58.default.encode(fullSecretKey);
                setBase58Key(base58String);
                // Store it for future use
                localStorage.setItem('ceelo_priv_b58', base58String);
              }).catch(err => {
                console.error('Failed to convert to Base58:', err);
                setBase58Key('Base58 conversion failed');
              });
            }
          } catch (e) {
            console.error('Failed to parse private key array:', e);
            setBase58Key('Base58 key not available');
          }
        } else {
          setBase58Key('Base58 key not available');
        }
      }
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  // Format the public key for display
  const formattedKey = publicKey && publicKey.length > 20
    ? `${publicKey.substring(0, 7)}...${publicKey.substring(publicKey.length - 7)}`
    : publicKey;

  const handleCopyPrivateKey = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('Failed to copy:', err));
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <span className="badge badge-success mr-2">Connected</span>
          <span>{formattedKey}</span>
        </div>
        <div>
          <button
            className="btn btn-outline-info btn-sm mr-2"
            onClick={() => setShowPrivateKey(!showPrivateKey)}
          >
            {showPrivateKey ? 'Hide Private Key' : 'Show Private Key'}
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {showPrivateKey && privateKey && (
        <div className="mt-2 p-2 border rounded bg-dark">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-warning">Wallet Information:</small>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={handleCopyPrivateKey}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="mt-1">
            <div className="alert alert-info text-light bg-dark border-info mb-0">
              <p className="mb-1">Your wallet address: <strong>{publicKey}</strong></p>

              <p className="mb-1 mt-2">Your private key - Array Format (for our app):</p>
              <textarea
                className="form-control form-control-sm bg-dark text-light"
                value={privateKey}
                readOnly
                rows={3}
              />

              <p className="mb-1 mt-2">Your private key - Base58 Format (for Phantom wallet):</p>
              <textarea
                className="form-control form-control-sm bg-dark text-light"
                value={base58Key || 'Loading Base58 key...'}
                readOnly
                rows={2}
              />

              <p className="mt-2 mb-0">
                <strong>Important:</strong> Save both private key formats somewhere secure.
                Use the Array format to restore in our app, and the Base58 format to import into Phantom wallet.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
