/**
 * resolve-stack.js
 *
 * Decodes a minified DWC stack trace back to the original sources.
 *
 * Stable releases are built with hidden sourcemaps: the maps never reach the browser, they are
 * published as srcmaps.zip next to the release. Feed this script a stack trace copied from the
 * browser console plus the maps of that release and it prints the original file, line, column
 * and source line for every frame it can resolve.
 *
 * Since chunk file names carry a content hash, a frame only resolves against the maps of the
 * exact build it came from - pointing --maps at a directory of collected release bundles lets
 * the script pick the matching one on its own.
 *
 * Usage:
 *   node scripts/resolve-stack.js [--maps <path>] [<trace-file>]
 *
 *   --maps, -m   .map directory, a .zip bundle, or a directory holding several .zip bundles
 *                (default: dist)
 *   <trace-file> File holding the stack trace; read from stdin when omitted
 *
 * Examples:
 *   node scripts/resolve-stack.js < trace.txt
 *   node scripts/resolve-stack.js --maps ~/srcmaps trace.txt
 *   xclip -o | node scripts/resolve-stack.js -m ~/srcmaps/srcmaps-3.7.0.zip
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { basename, join } from "path";
import { parseArgs } from "util";

import JSZip from "jszip";

const B64_INDEX = new Int16Array(128).fill(-1);
for (let i = 0; i < 64; i++) {
	B64_INDEX["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charCodeAt(i)] = i;
}

// Decode one comma-separated sourcemap segment into its signed VLQ fields. Generated columns run
// into the millions on a minified bundle, so the accumulator uses multiplication rather than
// shifting, which would wrap at 32 bits
function decodeVlq(segment) {
	const values = [];
	let value = 0, factor = 1;
	for (let i = 0; i < segment.length; i++) {
		const digit = B64_INDEX[segment.charCodeAt(i)];
		if (digit < 0) {
			throw new Error(`Invalid VLQ character "${segment[i]}" in mappings`);
		}
		value += (digit & 31) * factor;
		if (digit & 32) {
			factor *= 32;
		} else {
			values.push((value % 2 === 1) ? -(value - 1) / 2 : value / 2);
			value = 0;
			factor = 1;
		}
	}
	return values;
}

/**
 * Resolve generated positions against a parsed sourcemap.
 * Fields are delta-encoded across the entire mappings string, so there is no way to jump to a
 * line - the whole thing has to be walked once no matter how many positions are wanted.
 * @param map Parsed sourcemap
 * @param positions Array of { line, column }, both 1-based as they appear in a stack trace
 * @returns Array of { source, line, column, name, content, approximate } or null, in input order
 */
function resolvePositions(map, positions) {
	const nearest = new Map();
	const generatedLines = map.mappings.split(";");
	let sourceIndex = 0, sourceLine = 0, sourceColumn = 0, nameIndex = 0;
	for (let generatedLine = 0; generatedLine < generatedLines.length; generatedLine++) {
		let generatedColumn = 0;
		for (const segment of generatedLines[generatedLine].split(",")) {
			if (segment === "") {
				continue;
			}

			const fields = decodeVlq(segment);
			generatedColumn += fields[0];
			if (fields.length < 4) {
				// Generated code with no original position, e.g. a bundler helper
				continue;
			}

			sourceIndex += fields[1];
			sourceLine += fields[2];
			sourceColumn += fields[3];
			if (fields.length >= 5) {
				nameIndex += fields[4];
			}

			// Segments come in ascending order, so the last one at or before a wanted position is
			// its closest match. A mapping never spans generated lines, so a match from an earlier
			// line is a guess - the chunks of pre-bundled dependencies map only a few of their
			// lines and would resolve to nothing at all otherwise
			for (const position of positions) {
				if (generatedLine < position.line - 1 || (generatedLine === position.line - 1 && generatedColumn <= position.column - 1)) {
					nearest.set(position, {
						source: map.sources[sourceIndex],
						line: sourceLine + 1,
						column: sourceColumn + 1,
						name: (fields.length >= 5) ? map.names[nameIndex] : null,
						content: map.sourcesContent?.[sourceIndex] ?? null,
						approximate: generatedLine !== position.line - 1,
					});
				}
			}
		}
	}
	return positions.map((position) => nearest.get(position) ?? null);
}

// Recursively collect every file path under a directory
function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

// A directory of loose .map files as a map source
function directorySource(dir) {
	return {
		label: dir,
		load() {
			const maps = new Map();
			for (const file of walk(dir)) {
				if (file.endsWith(".map")) {
					maps.set(basename(file), () => readFileSync(file, "utf8"));
				}
			}
			return { maps, version: null };
		},
	};
}

// A .zip bundle as a map source. Loading is deferred so that pointing --maps at a directory of
// release bundles only unpacks the ones actually consulted
function zipSource(path) {
	return {
		label: path,
		async load() {
			const zip = await JSZip.loadAsync(readFileSync(path));
			const maps = new Map();
			for (const [name, entry] of Object.entries(zip.files)) {
				if (name.endsWith(".map")) {
					maps.set(basename(name), () => entry.async("string"));
				}
			}
			return { maps, version: (await zip.file("version.txt")?.async("string"))?.trim() ?? null };
		},
	};
}

// Turn --maps into an ordered list of candidate sources: loose maps first, then any zip bundles
function collectSources(path) {
	if (!existsSync(path)) {
		console.error(`Maps path "${path}" does not exist`);
		process.exit(1);
	}
	if (!statSync(path).isDirectory()) {
		return [zipSource(path)];
	}

	const sources = [];
	if (walk(path).some((file) => file.endsWith(".map"))) {
		sources.push(directorySource(path));
	}
	for (const entry of readdirSync(path).sort()) {
		if (entry.endsWith(".zip")) {
			sources.push(zipSource(join(path, entry)));
		}
	}
	return sources;
}

// Matches the `<file>.js:<line>:<column>` tail every browser puts in a stack frame, whether the
// file is a bare name, a URL or wrapped in parentheses
const FRAME_REGEX = /([^\s()@]+\.js):(\d+):(\d+)/g;

const { values, positionals } = parseArgs({
	options: {
		maps: { type: "string", short: "m", default: "dist" },
		help: { type: "boolean", short: "h", default: false },
	},
	allowPositionals: true,
});

if (values.help) {
	console.log("Usage: node scripts/resolve-stack.js [--maps <dir|zip>] [<trace-file>]");
	console.log("");
	console.log("  -m, --maps   .map directory, a .zip bundle, or a directory of .zip bundles (default: dist)");
	console.log("  <trace-file> file holding the stack trace, read from stdin when omitted");
	process.exit(0);
}

let trace;
if (positionals.length > 0) {
	trace = readFileSync(positionals[0], "utf8");
} else {
	if (process.stdin.isTTY) {
		process.stderr.write("Paste the stack trace, then press Ctrl-D:\n");
	}
	const chunks = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}
	trace = Buffer.concat(chunks).toString("utf8");
}

const sources = collectSources(values.maps);
if (sources.length === 0) {
	console.error(`No .map files and no .zip bundles found in "${values.maps}"`);
	process.exit(1);
}

// Gather the frames per chunk file so each map only gets walked once
const frames = [];
for (const line of trace.split("\n")) {
	const matches = [...line.matchAll(FRAME_REGEX)];
	// The last match wins: nested "eval at ..." frames name the enclosing script first
	const match = matches[matches.length - 1];
	frames.push(match ? { text: line.trim(), file: basename(match[1]), line: Number(match[2]), column: Number(match[3]) } : { text: line.trim() });
}

const framesByFile = new Map();
for (const frame of frames) {
	if (frame.file) {
		const forFile = framesByFile.get(frame.file) ?? [];
		forFile.push(frame);
		framesByFile.set(frame.file, forFile);
	}
}

if (framesByFile.size === 0) {
	console.error("No stack frames found in the input");
	process.exit(1);
}

const loaded = new Map();
const usedSources = new Set();
for (const [file, forFile] of framesByFile) {
	for (const source of sources) {
		if (!loaded.has(source)) {
			loaded.set(source, await source.load());
		}

		const read = loaded.get(source).maps.get(`${file}.map`);
		if (read) {
			usedSources.add(source);
			const resolved = resolvePositions(JSON.parse(await read()), forFile);
			forFile.forEach((frame, index) => {
				frame.mapped = true;
				frame.resolved = resolved[index];
			});
			break;
		}
	}
}

for (const source of usedSources) {
	const { version } = loaded.get(source);
	console.log(`Maps: ${source.label}${version ? ` (${version})` : ""}`);
}
console.log("");

for (const frame of frames) {
	console.log(frame.text);
	if (!frame.file) {
		continue;
	}
	if (!frame.resolved) {
		console.log(`    -> ${frame.mapped ? "nothing mapped before this position in" : "no map found for"} ${frame.file}`);
		continue;
	}

	const { source, line, column, name, content, approximate } = frame.resolved;
	const suffix = approximate ? " (nearest mapped position)" : (name ? ` (${name})` : "");
	console.log(`    ${approximate ? "~>" : "->"} ${source.replace(/^(\.\.\/)+/, "")}:${line}:${column}${suffix}`);
	if (content) {
		// A source that is itself a bundle has lines megabytes long, so keep the echo bounded
		const sourceLine = content.split("\n")[line - 1]?.trim() ?? "";
		if (sourceLine !== "") {
			console.log(`       ${(sourceLine.length > 200) ? `${sourceLine.slice(0, 200)}...` : sourceLine}`);
		}
	}
}
