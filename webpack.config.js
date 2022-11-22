const path = require('path');

module.exports = [{
  mode: 'development',
  target: 'web',
  entry: './src/index.js',
  output: {
    filename: "od.js",
    library: 'od',
    libraryTarget: 'umd',
    libraryExport: "od"
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