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
        test: /\.glsl$/,
        loader: 'webpack-glsl-loader'
      }
    ],
  }
}];