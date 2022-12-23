const CustomImportsPlugin = require("./webpack/lib/custom-imports-plugin.js");
const CompressionPlugin = require("compression-webpack-plugin");
const webpack = require('webpack');
const ZipPlugin = require("zip-webpack-plugin");

module.exports = {
	configureWebpack: {
		devtool: "source-map",
		optimization: {
			chunkIds: "named",
			concatenateModules: false,
			flagIncludedChunks: false,
			mergeDuplicateChunks: false,
			moduleIds: "named",
			removeAvailableModules: false,
			usedExports: false
		},
		performance: {
			hints: false
		},
		plugins: [
			new webpack.EnvironmentPlugin({
				"BUILD_DATETIME": (new Date()).toString()
			}),
			// Work around for Buffer is undefined:
			// https://github.com/webpack/changelog-v5/issues/10
			new webpack.ProvidePlugin({
				Buffer: ['buffer', 'Buffer'],
			}),
			...((process.env.NODE_ENV === "production") ? [
				new CustomImportsPlugin(),
				new CompressionPlugin({
					exclude: /\.zip$/,
					minRatio: Infinity
				}),
				...((process.env.NOZIP) ? [] : [
					new ZipPlugin({
						filename: "DuetWebControl-SD.zip",
						include: [/\.gz$/, /\.woff$/, /\.woff2$/],
						exclude: [/DummyPlugin/, "robots.txt"]
					}),
					new ZipPlugin({
						filename: "DuetWebControl-SBC.zip",
						exclude: [/DummyPlugin/, /\.gz$/, /\.zip$/]
					})
				])
			] : [])
		]
	},
	chainWebpack: config => {
		config.optimization.minimizer("terser").tap(args => {
			const { terserOptions } = args[0]
			terserOptions.keep_classnames = true;
			terserOptions.keep_fnames = true;
			return args;
		});
		config.optimization.set("splitChunks", {
			chunks: "all",
			cacheGroups: {
				defaultVendors: false,
				default: false
			}
		});
		config.plugins.delete("prefetch");
		config.plugins.delete("hash-module-ids");
	},
	pwa: {
		name: "Duet Web Control",
		themeColor: "#2196f3",
		appleMobileWebAppCapable: "yes",
		appleMobileWebAppStatusBarStyle: "black",
		workboxOptions: {
			maximumFileSizeToCacheInBytes: 20000000		// 20MB
		}
	},
	transpileDependencies: [
		"vuetify"
	]
}
