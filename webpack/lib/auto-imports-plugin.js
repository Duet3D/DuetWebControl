const assert = require('assert');
const fs = require('fs');
const packageInfo = require("../../package.json");

const pluginName = 'AutoImportsPlugin';

class AutoImportsPlugin {
	constructor() { }

	apply(compiler) {
        compiler.hooks.initialize.tap(pluginName, compilation => {
            // Generate file that auto-imports existing plugins
            let importsFile =
                "/**\n" +
                " * DO NOT MODIFY THIS FILE! IT IS AUTO-GENERATED ON COMPILATION!\n" +
                "*/\n" +
                "import { initCollection } from \"@duet3d/objectmodel\";\n" +
                "import DwcPlugin from \"./DwcPlugin\";\n" +
                "\n" +
                "export default initCollection(DwcPlugin, [\n";

            // Generate list of imports
            const files = fs.readdirSync("src/plugins", { withFileTypes: true });
            for (const file of files) {
                if (!file.isDirectory() || fs.existsSync(`src/plugins/${file.name}/blacklist`)) {
                    continue;
                }

                // Read plugin manifest
                let manifest;
                try {
                    manifest = JSON.parse(fs.readFileSync(`src/plugins/${file.name}/plugin.json`));
                } catch (e) {
                    throw new Error(`Failed to read plugin.json for plugin ${file.name}: ${e}`);
                }
                assert(file.name === manifest.id, `Plugin directory name of ${file.name} must match its manifest id`);

                // Get entry point
                let entryFile = null;
                if (fs.existsSync(`src/plugins/${file.name}/index.js`) || fs.existsSync(`src/plugins/${file.name}/index.ts`)) {
                    entryFile = `./${file.name}/index`;
                } else {
                    if (process.env.NODE_ENV === "production") {
                        // Skip third-party plugins when building core DWC
                        continue;
                    }

                    if (fs.existsSync(`src/plugins/${file.name}/dwc-src/index.js`) || fs.existsSync(`src/plugins/${file.name}/dwc-src/index.ts`)) {
                        entryFile = `./${file.name}/dwc-src/index`;
                    } else if (fs.existsSync(`src/plugins/${file.name}/src/index.js`) || fs.existsSync(`src/plugins/${file.name}/src/index.ts`)) {
                        entryFile = `./${file.name}/src/index`;
                    }
                }
                assert(entryFile !== null, `Missing entry point (index.js, index.ts, dwc-src/index.js, dwc-src/index.ts, src/index.js, src/index.ts) in plugin ${file.name}`);

                // Generate plugin entry
                importsFile += "	{\n";
                importsFile += `        id: "${manifest.id}",\n`;
                importsFile += `        name: "${manifest.name}",\n`;
                importsFile += `        author: "${manifest.author}",\n`;
                importsFile += `        version: "${manifest.version === "auto" ? packageInfo.version : manifest.version}",\n`;
                importsFile += "        loadDwcResources: () => import(\n";
                importsFile += `            /* webpackChunkName: "${file.name}" */\n`;
                importsFile += `            "${entryFile}"\n`;
                importsFile += "        )\n";
                importsFile += "    },\n";
            }
            
            // Finalize file
            importsFile += "]);\n";

            // Overwrite imports file
            const fd = fs.openSync("src/plugins/imports.ts", "w");
            fs.writeFileSync(fd, importsFile);
            fs.closeSync(fd);
        });
	}
}

module.exports = AutoImportsPlugin;
