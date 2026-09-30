//@ts-check
"use strict";

const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
require("dotenv").config();

/** @type {import('webpack').Configuration} */
const config = {
    target: "node",
    mode: "none",
    entry: "./src/extension.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "extension.js",
        libraryTarget: "commonjs2",
    },
    externals: {
        vscode: "commonjs vscode",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "ts-loader",
                    },
                ],
            },
        ],
    },
    plugins: [
        // Injeta somente o Client ID público do OAuth. Aplicativos desktop não protegem client_secret.
        new webpack.DefinePlugin({
            "process.env.GOOGLE_CLIENT_ID": JSON.stringify(process.env.GOOGLE_CLIENT_ID),
        }),
        // Copy webview assets (CSS, JS) và Codicons font vào dist/
        new CopyPlugin({
            patterns: [
                {
                    from: "src/webview/*.css",
                    to: "webview/[name][ext]",
                },
                {
                    from: "src/webview/*.js",
                    to: "webview/[name][ext]",
                },
                {
                    from: "node_modules/@vscode/codicons/dist",
                    to: "webview/codicons",
                },
                {
                    from: "node_modules/sql.js/dist/sql-wasm.wasm",
                    to: "sql-wasm.wasm",
                },
            ],
        }),
    ],
    devtool: "nosources-source-map",
    infrastructureLogging: {
        level: "log",
    },
};

module.exports = config;
