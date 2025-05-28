import React, { useState, useEffect } from 'react';
import { getWhitelist, getWhitelistStats, clearWhitelist, removeFromWhitelist, WhitelistEntry } from '../lib/whitelist';

export const WhitelistAdmin: React.FC = () => {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, recentlyActive: 0 });
  const [showAdmin, setShowAdmin] = useState(false);

  const refreshData = () => {
    setWhitelist(getWhitelist());
    setStats(getWhitelistStats());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleClearWhitelist = () => {
    if (window.confirm('Are you sure you want to clear the entire whitelist? This cannot be undone.')) {
      clearWhitelist();
      refreshData();
    }
  };

  const handleRemoveWallet = (address: string) => {
    if (window.confirm(`Remove wallet ${address.substring(0, 8)}... from whitelist?`)) {
      removeFromWhitelist(address);
      refreshData();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!showAdmin) {
    return (
      <div className="mt-3">
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setShowAdmin(true)}
        >
          🔧 Admin Panel
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 border border-secondary rounded bg-dark">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="text-warning mb-0">🔧 Whitelist Admin</h6>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setShowAdmin(false)}
        >
          Hide
        </button>
      </div>

      <div className="row mb-3">
        <div className="col-md-6">
          <div className="card bg-secondary text-white">
            <div className="card-body text-center">
              <h5 className="card-title">{stats.total}</h5>
              <p className="card-text small">Total Whitelisted</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <h5 className="card-title">{stats.recentlyActive}</h5>
              <p className="card-text small">Active (24h)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <button
          className="btn btn-danger btn-sm"
          onClick={handleClearWhitelist}
        >
          Clear All
        </button>
        <button
          className="btn btn-info btn-sm ml-2"
          onClick={refreshData}
        >
          Refresh
        </button>
      </div>

      <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <table className="table table-dark table-sm">
          <thead>
            <tr>
              <th>Wallet Address</th>
              <th>Created</th>
              <th>Last Access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {whitelist.map((entry, index) => (
              <tr key={index}>
                <td>
                  <code className="text-warning">
                    {entry.address.substring(0, 8)}...{entry.address.substring(entry.address.length - 8)}
                  </code>
                </td>
                <td>
                  <small>{formatDate(entry.createdAt)}</small>
                </td>
                <td>
                  <small>
                    {entry.lastAccessed ? formatDate(entry.lastAccessed) : 'Never'}
                  </small>
                </td>
                <td>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleRemoveWallet(entry.address)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {whitelist.length === 0 && (
        <div className="text-center text-muted py-3">
          <p>No whitelisted wallets found.</p>
        </div>
      )}
    </div>
  );
};
