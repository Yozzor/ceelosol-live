import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid var(--sa-red)',
          borderRadius: '10px',
          backgroundColor: 'rgba(180, 25, 29, 0.1)',
          color: 'var(--sa-sand)',
          textAlign: 'center'
        }}>
          <h2 style={{ 
            color: 'var(--sa-red)',
            fontFamily: 'Impact, Arial Black, sans-serif',
            marginBottom: '15px'
          }}>
            🚨 Something went wrong!
          </h2>
          <p style={{ marginBottom: '15px' }}>
            The application encountered an error. Please refresh the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(145deg, var(--sa-green), #2a5a24)',
              border: '2px solid var(--sa-gold)',
              color: 'var(--sa-sand)',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '1rem'
            }}
          >
            🔄 Refresh Page
          </button>
          
          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginTop: '20px', 
              textAlign: 'left',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '15px',
              borderRadius: '5px',
              fontSize: '0.9rem'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                🔍 Error Details (Development)
              </summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word',
                color: 'var(--sa-sand)',
                fontSize: '0.8rem'
              }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
