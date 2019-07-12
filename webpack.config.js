'use strict';

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = [
    {
        name: 'extension',
        target: 'node',
        entry: {
            extension: './src/extension.ts',
            "alternatives-panel": './src/alternatives-panel.scss'
        },
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: '[name].js',
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate: '../[resource-path]'
        },
        devtool: 'source-map',
        externals: {
            vscode: 'commonjs vscode'
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            symlinks: false
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.(sa|sc|c)ss$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                            options: {
                                hmr: process.env.NODE_ENV === 'development',
                            },
                        },
                        'css-loader',
                        'sass-loader',
                    ],
                }
            ]
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].css',
                chunkFilename: '[id].css'
            })
        ]
    },
    {
        name: 'webview',
        target: 'web',
        entry: {
            alternatives: './src/alternatives.ts',
            docs: './src/docs.js'
        },
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: '[name].js',
            devtoolModuleFilenameTemplate: '../[resource-path]'
        },
        devtool: 'source-map',
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            symlinks: false
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                }
            ]
        }
    }
];
