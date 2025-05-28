const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only use proxy in development
  if (process.env.NODE_ENV === 'development') {
    // Proxy API requests
    app.use(
      '/api',
      createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
      })
    );

    // Proxy Socket.io requests
    app.use(
      '/socket.io',
      createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // Enable websocket proxying
      })
    );
  }
};
