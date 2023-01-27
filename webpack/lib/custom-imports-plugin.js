const assert = require('assert');
const Compilation = require('webpack/lib/Compilation');
const RuntimeGlobals = require('webpack/lib/RuntimeGlobals');

const pluginName = 'CustomImportsPlugin';

class CustomImportPlugin {
	constructor() { }

	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, compilation => {
			const basicFn = compilation.runtimeTemplate.basicFunction;
			compilation.runtimeTemplate.basicFunction = (args, body) => {
				// Patch generation of RuntimeGlobals.getChunkScriptFilename, RuntimeGlobals.getChunkCssFilename, and mini-css loader calls.
				// There may be a nicer way to achieve this in Webpack 5 using hooks but I really have no clue how.
				if (args === "chunkId" && body instanceof Array && body.length > 0 && body[0].includes("// return url for filenames")) {
					// Adjust it for CSS chunks
					if (body.some(line => line.includes('"css/"'))) {
						return basicFn.call(compilation.runtimeTemplate, args, [
							"if (typeof window !== 'undefined' && window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId) {",
							"\treturn window.pluginBeingLoaded.dwcFiles.find(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.css$/.test(file));",
							"}"
						].concat(body));
					}

					// Adjust it for JS chunks
					if (body.some(line => line.includes('"js/"'))) {
						return basicFn.call(compilation.runtimeTemplate, args, [
							"if (typeof window !== 'undefined' && window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId) {",
							"\treturn window.pluginBeingLoaded.dwcFiles.find(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.js$/.test(file));",
							"}"
						].concat(body));
					}
				} else if (args === "chunkId, promises" && body instanceof Array && body.some(line => line.includes("cssChunks[chunkId])"))) {
					// Adjust mini-css loader check
					const newBody = [];
					for (const line of body) {
						if (line.includes("cssChunks[chunkId])")) {
							newBody.push(line.replace("&& cssChunks[chunkId])", "&& (cssChunks[chunkId] || (typeof window !== 'undefined' && window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId && window.pluginBeingLoaded.dwcFiles.some(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.css$/.test(file)))))"));
						} else {
							newBody.push(line);
						}
					}
					return basicFn.call(compilation.runtimeTemplate, args, newBody);
				}
				return basicFn.call(compilation.runtimeTemplate, args, body);
			};

			compilation.hooks.processAssets.tap(
				{
					name: pluginName,
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
				},
				(assets) => {
					for (const [pathname, asset] of Object.entries(assets)) {
						if (pathname.startsWith("js/app")) {
							const source = asset.source();
							assert(
								source.includes("if (typeof window !== 'undefined' && window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId) {"),
								"Resulting app chunk does not contain custom imports patch"
							);
							assert(
								source.includes(`${RuntimeGlobals.getChunkScriptFilename}`),
								"Resulting app chunk does not contain getChunkScriptFilename function"
							);
							assert(
								source.includes("&& (cssChunks[chunkId] ||"),
								"Resulting app chunk does not contain patched miniCss loader check"
							);
						}
					}
				}
			);
		});
	}
}

module.exports = CustomImportPlugin;
