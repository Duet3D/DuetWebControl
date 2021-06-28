const assert = require('assert');
const pluginName = 'CustomImportsPlugin';

/**
 * This plugin modifies the webpack bootstrap code in order to support variable
 * chunk names / assets. It is inspired by the JsonpScriptSrcPlugin by jchip
 * from https://github.com/webpack/webpack/issues/8115. Thanks for that!
 */

class CustomImportPlugin {
	constructor() {}

	_applyMainTemplate(mainTemplate) {
		// tapable/lib/Hook.js
		// use stage 1 to ensure this executes after webpack/lib/web/JsonpMainTemplatePlugin.js
		mainTemplate.hooks.localVars.tap({ name: pluginName, stage: 1 }, (source, chunk, hash) => {
			assert(
				source.includes("function jsonpScriptSrc"),
				"CustomImportsPlugin: main template bootstrap source doesn't have function jsonpScriptSrc"
			);

			const modSource = source.replace("function jsonpScriptSrc", "function webpackJsonpScriptSrc");
			return `${modSource}

function jsonpScriptSrc(chunkId) {
	if (window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId) {
		return window.pluginBaseURL + window.pluginBeingLoaded.dwcFiles.find(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.js$/.test(file));
	}
	return webpackJsonpScriptSrc(chunkId);
}
`;
		});

		// use stage 1 to ensure this executes after mini-css-extract-plugin
		mainTemplate.hooks.requireEnsure.tap({ name: pluginName, stage: 1 }, (source, chunk, hash) => {
			assert(
				source.includes('&& cssChunks[chunkId])'),
				"CustomImportsPlugin: CSS template bootstrap source doesn't have cssChunks check");
			assert(
				source.includes(`var fullhref = ${mainTemplate.requireFn}.p + href;`),
				"CustomImportsPlugin: CSS template bootstrap source doesn't have fullref variable"
			);

			const modSource = source.replace('&& cssChunks[chunkId])', '&& (cssChunks[chunkId] || (window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId && window.pluginBeingLoaded.dwcFiles.some(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.css$/.test(file)))))');
			return modSource.replace(`var fullhref = ${mainTemplate.requireFn}.p + href;`, `
var fullhref;
if (window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId && window.pluginBeingLoaded.dwcFiles.some(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.css$/.test(file))) {
	fullhref = window.pluginBaseURL + window.pluginBeingLoaded.dwcFiles.find(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.css$/.test(file));
} else {
	fullhref = ${mainTemplate.requireFn}.p + href;
}
`);
		});
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
			this._applyMainTemplate(compilation.mainTemplate);
		});
	}
}

module.exports = CustomImportPlugin;
