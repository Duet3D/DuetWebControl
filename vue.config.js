const CustomImportsPlugin = require('./webpack/lib/custom-imports-plugin.js')
const CompressionPlugin = require('compression-webpack-plugin')
const ZipPlugin = require('zip-webpack-plugin')

module.exports = {
	configureWebpack: {
		devtool: 'source-map',
		externals: {
			moment: 'moment'
		},
		optimization: {
			chunkIds: 'named',
			concatenateModules: false,
			flagIncludedChunks: false,
			mergeDuplicateChunks: false,
			moduleIds: 'named',
			occurrenceOrder: false,
			removeAvailableModules: false,
			usedExports: false
		},
		performance: { hints: false },
		plugins: (process.env.NODE_ENV === 'production') ? [
			new CustomImportsPlugin(),
			new CompressionPlugin({
				minRatio: Infinity
			}),
			...((process.env.NOZIP) ? [] : [
				new ZipPlugin({
					filename: 'DuetWebControl-SD.zip',
					include: [/\.gz$/, /\.woff$/, /\.woff2$/],
					exclude: [/DummyPlugin/, 'robots.txt']
				}),
				new ZipPlugin({
					filename: 'DuetWebControl-SBC.zip',
					exclude: [/\.gz$/, /\.zip$/, /DummyPlugin/]
				})
			])
		] : []
	},
	chainWebpack: config => {
		config.optimization.minimizer('terser').tap(args => {
			const { terserOptions } = args[0]
			terserOptions.keep_classnames = true;
			terserOptions.keep_fnames = true;
			return args
		});
		config.optimization.set('splitChunks', {
			chunks: 'all',
			cacheGroups: {
				default: false,
				vendors: false
			}
		});
		config.plugins.delete('prefetch');
		config.plugins.delete('hash-module-ids');
	},
	pwa: {
		name: 'Duet Web Control',
		themeColor: '#2196f3',
		appleMobileWebAppCapable: 'yes',
		appleMobileWebAppStatusBarStyle: 'black'
	},
	transpileDependencies: [
		'vuetify'
	]
}
