import React from "react";
import ReactDOM from "react-dom/client";
import { EnhancedPlayPage } from './components/EnhancedPlayPage';
import './index.css';
import './globals.css'; // Import GTA-style globals
import { WalletProvider } from "./util/wallet";
import { ConnectionProvider } from "./util/connection";
import { AuthProvider } from "./util/auth";
import { AppAccessManager } from "./components/AppAccessManager";
import ErrorBoundary from "./components/ErrorBoundary";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

// Header component
export function Header() {
  return (
    <div className="container">
      <nav className="navbar navbar-dark navbar-expand-lg bg-transparent">
        <div className="navbar-brand mx-auto">
          <a className="d-inline-block align-top text-sr" href="/">
            <img src="/assets/ceelosologo.png" alt="CeeloSol" height="60" />
          </a>
        </div>
      </nav>
    </div>
  );
}

// Main App component
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      history: [],
    };
  }
  render() {
    return (
      <div>
        <WalletProvider>
          <Header />
          <EnhancedPlayPage />
        </WalletProvider>
      </div>
    );
  }
}

// React 18 createRoot API
const container = document.getElementById("root") as HTMLElement;

// Check if we already have a root instance in development
// This prevents the "You are calling ReactDOMClient.createRoot() on a container that has already been passed to createRoot()" warning
let root;
if (process.env.NODE_ENV === 'development' && (window as any).__REACT_ROOT__) {
  root = (window as any).__REACT_ROOT__;
} else {
  root = ReactDOM.createRoot(container);
  // Store the root instance in development
  if (process.env.NODE_ENV === 'development') {
    (window as any).__REACT_ROOT__ = root;
  }
}

root.render(
  <ErrorBoundary>
    <ConnectionProvider>
      <AuthProvider>
        <AppAccessManager>
          <BrowserRouter>
            <Switch>
              <Route path="/" exact component={App} />
              <Redirect from="*" to="/" exact />
            </Switch>
          </BrowserRouter>
        </AppAccessManager>
      </AuthProvider>
    </ConnectionProvider>
  </ErrorBoundary>
);
