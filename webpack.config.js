const path = require('path')
const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const SRC = path.resolve(__dirname, 'src')
const DIST = path.resolve(__dirname, 'dist')
const MODE = process.env.NODE_ENV || 'development'

const externalModules = {
    'electron': 'commonjs electron',
    'express': 'commonjs express',
    'socket.io': 'commonjs socket.io',
    'chokidar': 'commonjs chokidar'
}

module.exports = {
    entry: {
        'main': `${SRC}/main.js`,
        'index': `${SRC}/renderer/index.js`,
        'scripts/share': `${SRC}/server/views/share.js`
    },
    output: {
        publicPath: '',
        filename: '[name].js',
        path: DIST
    },
    externals: externalModules,
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                    },
                },
            },
            {
                test: /\.css/,
                use: ['style-loader', 'css-loader']
            }
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.node.NodeTargetPlugin(),
        new webpack.electron.ElectronTargetPlugin(),
        new webpack.DefinePlugin({
            MODE: JSON.stringify(MODE),
            RELOAD: 88
        }),
        new CopyPlugin({ // "copy-webpack-plugin": "^9.1.0" ( Problem occurs in 10.0.0 )
            patterns: [
                {
                    from: `${SRC}/renderer/index.html`
                },
                {
                    from: `${SRC}/server/views/share.ejs`,
                    to: `${DIST}/views/share.ejs`
                },
                {
                    from: `${SRC}/server/views/close.ejs`,
                    to: `${DIST}/views/close.ejs`
                }
            ]
        }),
    ],
    node: {
        __dirname: false,
    },
    devtool: 'cheap-module-source-map',
    mode: MODE,
}