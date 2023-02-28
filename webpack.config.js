const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = [{
  mode: 'development',
  target: 'web',
  entry: './src/index.js',
  output: {
    filename: "wod.js",
    library: 'wod',
    libraryTarget: 'umd'
  },
  watchOptions: {
    ignored: 'node_modules/**',
  },
  module: {
    rules: [
      {
        test: /\.(scss|css)$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.glsl$/,
        loader: 'webpack-glsl-loader'
      }
    ],
  }
}];