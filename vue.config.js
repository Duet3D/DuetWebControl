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
				filename: 'DuetWebControl-Duet2.zip',
				include: [/\.gz$/, /\.woff$/, /\.woff2$/],
			}),
			new ZipPlugin({
				filename: 'DuetWebControl-Duet3.zip',
				exclude: [/\.gz$/, /\.zip$/]
			})
		] : []
	},
	chainWebpack: config => {
		config.optimization.delete('splitChunks')
	}
}
