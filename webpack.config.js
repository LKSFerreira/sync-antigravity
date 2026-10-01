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
        clean: true,
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
        // Clientes OAuth desktop não conseguem manter este identificador técnico secreto.
        // O Google exige ambos os valores para este cliente durante a troca de tokens.
        new webpack.DefinePlugin({
            "process.env.GOOGLE_CLIENT_ID": JSON.stringify(process.env.GOOGLE_CLIENT_ID),
            "process.env.GOOGLE_CLIENT_SECRET": JSON.stringify(process.env.GOOGLE_CLIENT_SECRET),
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
                    from: "node_modules/@vscode/codicons/dist/codicon.css",
                    to: "webview/codicons/codicon.css",
                },
                {
                    from: "node_modules/@vscode/codicons/dist/codicon.ttf",
                    to: "webview/codicons/codicon.ttf",
                },
                {
                    from: "node_modules/sql.js/dist/sql-wasm.wasm",
                    to: "sql-wasm.wasm",
                },
                {
                    from: "node_modules/sql.js/dist/sql-wasm.js",
                    to: "sql-wasm.js",
                },
                {
                    from: "src/core/layout-replacement-helper.js",
                    to: "layout-replacement-helper.js",
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
