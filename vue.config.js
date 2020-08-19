const CompressionPlugin = require('compression-webpack-plugin')
const ZipPlugin = require('zip-webpack-plugin')

module.exports = {
	configureWebpack: {
		performance: { hints: false },
		plugins: (process.env.NODE_ENV === 'production') ? [
			new CompressionPlugin({
				cache: true
			}),
			new ZipPlugin({
				filename: 'DuetWebControl-SD.zip',
				include: [/\.gz$/, /\.woff$/, /\.woff2$/],
			}),
			new ZipPlugin({
				filename: 'DuetWebControl-SBC.zip',
				exclude: [/\.gz$/, /\.zip$/]
			})
		] : []
	},
	chainWebpack: config => {
		config.optimization.set('splitChunks', {
			chunks: 'all',
			cacheGroups: {
				default: false,
				vendors: false
			}
		});
		config.plugins.delete('prefetch');
	},
	transpileDependencies: [
		'vuetify'
	]
}
