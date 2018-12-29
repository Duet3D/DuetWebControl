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
				filename: 'DuetWebControl-mini.zip',
				include: [/\.gz$/, /\.woff$/, /\.woff2$/],
				exclude: [/\.map.gz$/]
			}),
			new ZipPlugin({
				filename: 'DuetWebControl.zip',
				include: [/\.gz$/, /\.woff$/, /\.woff2$/],
			})
		] : []
	},
	chainWebpack: config => {
		config.optimization.delete('splitChunks')
	}
}
