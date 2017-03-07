const validate = require('webpack-validator');
const path = require('path');

const config = {
  entry: './src/zepto-es6.js',
  output: {
    filename: 'rezepto.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['', '.js']
  },
  module: {
    preLoaders: [{
      test: /\.(js)$/,
      loaders: ['eslint-loader'],
    }],
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/
    }]
  }
};

module.exports = validate(config, {
  quiet: true
});
