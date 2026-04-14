const assert = require('assert');
const Compilation = require('webpack/lib/Compilation');
const RuntimeGlobals = require('webpack/lib/RuntimeGlobals');
const { sources: { RawSource } } = require('webpack');

const pluginName = 'CustomImportsPlugin';

class CustomImportPlugin {
	constructor() { }

	apply(compiler) {
		compiler.hooks.compilation.tap(pluginName, compilation => {
			compilation.hooks.processAssets.tap(
				{
					name: pluginName,
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
				},
				(assets) => {
					// Patch the chunk that contains the webpack runtime (and thus the
					// chunk filename functions). This is js/runtime* if optimization
					// .runtimeChunk is enabled, otherwise js/app*.
					const runtimeChunk = Object.keys(assets).find(p => p.startsWith("js/runtime"));
					const targetPrefix = runtimeChunk ? "js/runtime" : "js/app";
					for (const pathname in assets) {
						if (!pathname.startsWith(targetPrefix)) continue;

						let source = assets[pathname].source();

						// Inject plugin loading checks into chunk filename functions.
						// These functions contain a "// return url for filenames" comment
						// followed by the filename template referencing either "js/" or "css/".
						const filenameComment = "// return url for filenames";
						let searchStart = 0;
						let idx;
						while ((idx = source.indexOf(filenameComment, searchStart)) !== -1) {
							// Look ahead to determine if this is a JS or CSS filename function
							const nextChunk = source.substring(idx, idx + 500);

							let ext;
							if (nextChunk.includes('"js/"')) {
								ext = 'js';
							} else if (nextChunk.includes('"css/"')) {
								ext = 'css';
							} else {
								searchStart = idx + filenameComment.length;
								continue;
							}

							const check =
								'if (typeof window !== \'undefined\' && window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId) {\n' +
								'\treturn window.pluginBeingLoaded.dwcFiles.find(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.' + ext + '$/.test(file));\n' +
								'}\n';

							source = source.substring(0, idx) + check + source.substring(idx);
							searchStart = idx + check.length + filenameComment.length;
						}

						// Patch mini-css-extract-plugin loader check
						source = source.replace(
							'&& cssChunks[chunkId])',
							"&& (cssChunks[chunkId] || (typeof window !== 'undefined' && window.pluginBeingLoaded && window.pluginBeingLoaded.id === chunkId && window.pluginBeingLoaded.dwcFiles.some(file => file.indexOf(window.pluginBeingLoaded.id) !== -1 && /\\.css$/.test(file)))))"
						);

						// Update the asset with patched source
						compilation.updateAsset(pathname, new RawSource(source));

						// Validate patches were applied
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
						break;
					}
				}
			);
		});
	}
}

module.exports = CustomImportPlugin;
