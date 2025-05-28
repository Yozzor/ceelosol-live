const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    assert: require.resolve("assert/"),
    stream: require.resolve("stream-browserify"),
    url: require.resolve("url/"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    buffer: require.resolve("buffer/"),
    crypto: require.resolve("crypto-browserify"),
    process: require.resolve("process/browser"),
  };
  
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    })
  );
  
  return config;
};
