module.exports = {
	presets: [
		// Our browserslist targets modern browsers (last 2 versions, not IE), which already support every ES feature we use
		// natively. Disable automatic core-js polyfill insertion to avoid pulling in shared core-js chunks (URLSearchParams,
		// etc.) that would otherwise be extracted as tiny sibling files by webpack's code splitting
		["@vue/app", { useBuiltIns: false }]
	],
	plugins: [
		["transform-builtin-extend", {
			globals: ["Error", "Array"]
		}]
	]
}
