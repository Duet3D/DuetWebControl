// http://eslint.org/docs/user-guide/configuring

module.exports = {
	root: true,
	parser: 'babel-eslint',
	parserOptions: {
		sourceType: 'module'
	},
	env: {
		browser: true,
	},
	// https://github.com/feross/standard/blob/master/RULES.md#javascript-standard-style
	extends: 'standard',
	// required to lint *.vue files
	plugins: [
		'html'
	],
	// add your custom rules here
	'rules': {
		// allow paren-less arrow functions
		'arrow-parens': 0,
		// allow async-await
		'generator-star-spacing': 0,
		// allow debugger during development
		'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
		// use tabs
		'no-tabs': 0,
		'indent': ["warn", "tab", { "SwitchCase": 1 }],
		// no space before functions
		'space-before-function-paren': 0,
		// allow semicolons
		'semi': 0,
		// don't care about double quotes
		'quotes': 0,
		// ignore assignment for lambda functions
		'no-return-assign': 0,
		// allow multiple variable declarations in one line
		'one-var': 0
	}
}
