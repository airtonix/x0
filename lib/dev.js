const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const WebpackDevServer = require("webpack-dev-server")
const history = require('connect-history-api-fallback')
const convert = require('koa-connect')
const MiniHTMLWebpackPlugin = require('mini-html-webpack-plugin')
const merge = require('webpack-merge')

const baseConfig = require('./config')
const createTemplate = require('./createTemplate')

module.exports = async (opts) => {
  if (opts.basename) delete opts.basename
  const config = merge(baseConfig, opts.webpack)
  const template = createTemplate(opts)

  config.mode = 'development'
  config.context = opts.dirname
  config.entry = opts.entry || path.join(__dirname, '../src/entry')
  config.output = {
    path: path.join(process.cwd(), 'dev'),
    filename: 'dev.js',
    publicPath: '/'
  }

  config.resolve.modules.unshift(
    opts.dirname,
    path.join(opts.dirname, 'node_modules')
  )

  if (config.resolve.alias) {
    const whcAlias = config.resolve.alias['webpack-hot-client/client']
    if (!fs.existsSync(whcAlias)) {
      const whcPath = path.dirname(require.resolve('webpack-hot-client/client'))
      config.resolve.alias['webpack-hot-client/client'] = whcPath
    }
  }

  config.plugins.push(
    new webpack.DefinePlugin({
      DEV: JSON.stringify(true),
      OPTIONS: JSON.stringify(opts),
      DIRNAME: JSON.stringify(opts.dirname),
      MATCH: JSON.stringify(opts.match)
    })
  )

  config.plugins.push(
    new MiniHTMLWebpackPlugin({
      context: opts,
      template
    })
  )

  if (opts.analyze) {
    const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
    const analyzerPort = typeof opts.analyze === 'string'
      ? opts.analyze
      : 8888
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerPort
      })
    )
  }

  if (opts.debug) {
    config.stats = 'verbose'
    // todo: enable other logging
  }

  const serveOpts = Object.assign({}, config.devServer, {
    hot: true,

    stats: {
      colors: true
    },

    // dev,
    logLevel: opts.logLevel || 'error',
    clientLogLevel: opts.logLevel || 'error',
    contentBase: opts.dirname,

    // port: opts.port,
    before (app) {
      app.use(history({}));
    }
  });

  return new Promise((resolve, reject) => {
    const compiler = webpack(config);
    const {port, host} = opts;
    WebpackDevServer.addDevServerEntrypoints(config, serveOpts)
    const server = new WebpackDevServer(compiler, serveOpts)
    server.listen(port, host, (err) => {
        if (err) {
          reject(err);
          return;
        }
        compiler.hooks.done
          .tap({ name: 'x0' }, (stats) => {
            const server = {port, host};
            resolve({ server, stats })
          })
      });
  })
}
