const CompressionPlugin = require('compression-webpack-plugin')
const ZipPlugin = require('zip-webpack-plugin')

module.exports = {
	configureWebpack: {
		plugins: [
			new CompressionPlugin({
				cache: true
			}),
			new ZipPlugin({
				filename: 'DuetWebControl.zip',
				include: [/\.gz$/, /\.woff$/, /\.woff2$/],
				exclude: [/\.map.gz$/]
			}),
			new ZipPlugin({
				filename: 'DuetWebControl-symbols.zip',
				include: [/\.gz$/, /\.woff$/, /\.woff2$/],
			})
		]
	}
}
