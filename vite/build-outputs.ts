import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import JSZip from "jszip";
import type { Plugin, ResolvedConfig } from "vite";

// Recursively collect every file path under a directory
async function walk(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(entries.map((entry) => {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
	}));
	return nested.flat();
}

// Build one zip from a list of files, using paths relative to outDir as entry names.
// Entries in `extra` are added verbatim under the given name
async function makeZip(zipPath: string, files: string[], outDir: string, extra: Record<string, string> = {}): Promise<void> {
	const zip = new JSZip();
	for (const file of files) {
		zip.file(relative(outDir, file).split("\\").join("/"), await readFile(file));
	}
	for (const [name, content] of Object.entries(extra)) {
		zip.file(name, content);
	}
	const buffer = await zip.generateAsync({
		type: "nodebuffer",
		compression: "DEFLATE",
		compressionOptions: { level: 9 },
	});
	await writeFile(zipPath, buffer);
}

/**
 * Shapes the production build output for DWC's two deployment targets:
 *  - a `.gz` sibling for every asset, since a standalone Duet's HTTP server serves pre-gzipped files
 *  - DuetWebControl-SD.zip: the gzipped assets plus raw fonts, for the board's SD card
 *  - DuetWebControl-SBC.zip: the uncompressed assets, for DSF / SBC installs
 *  - srcmaps.zip: the maps of a hidden-sourcemap build, kept out of the two deployment zips and
 *    published alongside a release for offline stack trace lookups, see scripts/resolve-stack.js
 * Set the NOZIP env var to skip the zip step (gzipping still runs)
 */
export default function buildOutputs(): Plugin {
	let root = process.cwd();
	let outDir = "dist";
	let hiddenSourcemaps = false;
	return {
		name: "dwc-build-outputs",
		apply: "build",
		// Run after vite-plugin-pwa so the SW (service-worker.js, workbox-*.js) is on disk
		// when we snapshot dist for gzipping and zipping
		enforce: "post",
		configResolved(config: ResolvedConfig) {
			root = config.root;
			outDir = resolve(config.root, config.build.outDir);
			hiddenSourcemaps = config.build.sourcemap === "hidden";
		},
		async closeBundle() {
			// gzip every emitted asset, skipping anything already gzipped or zipped. Hidden maps
			// are never served, so they don't get a .gz sibling either
			for (const file of await walk(outDir)) {
				if (file.endsWith(".gz") || file.endsWith(".zip") || (hiddenSourcemaps && file.endsWith(".map"))) {
					continue;
				}
				await writeFile(`${file}.gz`, gzipSync(await readFile(file), { level: 6 }));
			}

			if (process.env.NOZIP) {
				return;
			}

			// snapshot after gzipping but before any zip exists, so the zips never contain each other
			const files = await walk(outDir);

			// SD card: the pre-gzipped assets plus the raw (already-compressed) fonts, minus robots.txt
			await makeZip(
				join(outDir, "DuetWebControl-SD.zip"),
				files.filter((f) => /\.(gz|woff|woff2)$/.test(f) && !/robots\.txt/.test(f)),
				outDir,
			);

			// DSF / SBC: the uncompressed assets, with no .gz or .zip files
			await makeZip(
				join(outDir, "DuetWebControl-SBC.zip"),
				files.filter((f) => !/\.(gz|zip)$/.test(f) && !(hiddenSourcemaps && f.endsWith(".map"))),
				outDir,
			);

			// Maps are only useful next to the build they came from, so stamp the bundle with the
			// product and version it belongs to - OEM forks rename the product
			if (hiddenSourcemaps) {
				const { productName, version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
				await makeZip(
					join(outDir, "srcmaps.zip"),
					files.filter((f) => f.endsWith(".map")),
					outDir,
					{ "version.txt": `${productName} ${version}\n` },
				);
			}
		},
	};
}
