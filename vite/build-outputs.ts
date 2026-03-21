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

// Build one zip from a list of files, using paths relative to outDir as entry names
async function makeZip(zipPath: string, files: string[], outDir: string): Promise<void> {
	const zip = new JSZip();
	for (const file of files) {
		zip.file(relative(outDir, file).split("\\").join("/"), await readFile(file));
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
 * Set the NOZIP env var to skip the zip step (gzipping still runs)
 */
export default function buildOutputs(): Plugin {
	let outDir = "dist";
	return {
		name: "dwc-build-outputs",
		apply: "build",
		configResolved(config: ResolvedConfig) {
			outDir = resolve(config.root, config.build.outDir);
		},
		async closeBundle() {
			// gzip every emitted asset, skipping anything already gzipped or zipped
			for (const file of await walk(outDir)) {
				if (file.endsWith(".gz") || file.endsWith(".zip")) {
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
				files.filter((f) => !/\.(gz|zip)$/.test(f)),
				outDir,
			);
		},
	};
}
