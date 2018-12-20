module.exports = {
	presets: [
		'@vue/app'
	],
	plugins: [
		["transform-builtin-extend", {
			globals: ["Error", "Array"]
		}]
	],
}
