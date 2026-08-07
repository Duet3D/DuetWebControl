// Firmware-install / DWC self-update pipeline. Caller hands in the raw files the user picked
// or dropped; planFiles() classifies them (firmware bundle vs plain firmware/IAP/bootloader/
// WiFi/display binaries vs web assets vs SBC .deb packages), rewrites each file's destination
// path, and reports which boards/modules need an M997 update afterwards. confirmAndRun() drives
// the M997 sequencing and waits for the firmware to leave the updating state, then optionally
// reloads DWC when its own web bundle was just replaced

import { DisconnectedError } from "@duet3d/connectors";
import { type Board, MachineStatus, MainBoard, NetworkInterfaceType } from "@duet3d/objectmodel";
import type JSZip from "jszip";
import type { JSZipObject } from "jszip";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { ZipExtractionError } from "@/utils/errors";
import Path from "@/utils/path";

// Static list of extensions that always belong under /www on the board. Files matching one of
// these get routed to the web-asset directory regardless of which subfolder of the upload they
// came from
const webExtensions: Array<string> = [
	".htm", ".html", ".ico", ".xml", ".css", ".map", ".js", ".ttf", ".eot", ".svg",
	".woff", ".woff2", ".jpeg", ".jpg", ".png"
];

const panelDueDisplays = new Set<string>(["PanelDueFirmware.bin", "DuetScreen.bin"]);

// Bundles of system packages that DuetPluginService unpacks and installs itself. The suffix lets
// callers distinguish multiple bundles (dsf-update-full.zip) without them being mistaken for an
// ordinary firmware ZIP, which would be expanded and have its members classified individually
const systemPackageBundle = /^dsf-update(-.+)?\.zip$/i;

export interface FirmwareUpdatePlan {
	/**
	 * Files prepared for upload with their final destination paths already applied
	 */
	files: Array<{ filename: string; content: Blob | File }>;

	/**
	 * Whether index.html(.gz) was part of the payload, i.e. DWC itself is being updated
	 */
	webInterfaceTouched: boolean;

	/**
	 * Whether a config file that warrants the post-upload reset prompt was replaced: config.g always
	 * counts, board.txt only on non-Duet mainboards (genuine Duet boards do not use board.txt)
	 */
	configReplaced: boolean;

	/**
	 * Which CAN addresses are getting new firmware (0 = main board)
	 */
	firmwareBoards: Array<number>;

	/**
	 * Whether the WiFi server module needs a refresh
	 */
	wifiServer: boolean;

	/**
	 * Whether the connected PanelDue/DuetScreen firmware was uploaded
	 */
	display: boolean;
}

interface ClassifyContext {
	directories: {
		firmware: string;
		system: string;
		web: string;
	};
	hasSbc: boolean;
	hasWifi: boolean;
	boards: ReadonlyArray<Board | null>;
	mainboard: MainBoard | null;
	mainboardIsGenuineDuet: boolean;
}

export function useFirmwareInstall() {
	const machineStore = useMachineStore();
	const uiStore = useUiStore();

	// Build a one-shot snapshot of the bits of the object model the classifier reads. Doing it
	// once keeps the per-file loop free of repeated `machineStore.model.*` lookups
	function buildContext(): ClassifyContext {
		const model = machineStore.model;
		// The main board reports a name like "Duet 3 MB6HC"; LPC/STM32 ports configured via board.txt
		// report a non-Duet name, which is how we tell a genuine board from a fork
		const mainboard = (model.boards[0] instanceof MainBoard) ? model.boards[0] : null;
		return {
			directories: {
				firmware: model.directories.firmware,
				system: model.directories.system,
				web: model.directories.web,
			},
			hasSbc: model.sbc !== null,
			hasWifi: model.network.interfaces.some((iface) => iface !== null && iface.type === NetworkInterfaceType.wifi),
			boards: model.boards as ReadonlyArray<Board | null>,
			mainboard,
			mainboardIsGenuineDuet: mainboard !== null && mainboard.name.includes("Duet"),
		};
	}

	function matchesBoardBinary(boardValue: string, fileName: string): boolean {
		const binRegEx = new RegExp(boardValue.replace(/\.bin$/, "(.*)\\.bin"), "i");
		const uf2RegEx = new RegExp(boardValue.replace(/\.uf2$/, "(.*)\\.uf2"), "i");
		return binRegEx.test(fileName) || uf2RegEx.test(fileName);
	}

	// Match a firmware binary against every board, not just the first hit: identical boards (e.g.
	// two tool boards of the same type) share one firmwareFileName but sit at distinct CAN
	// addresses, and each one needs its own M997
	function findFirmwareName(ctx: ClassifyContext, fileName: string): { name: string; canAddresses: Array<number> } | null {
		let name: string | null = null;
		const canAddresses: Array<number> = [];
		for (const board of ctx.boards) {
			if (board && board.firmwareFileName && matchesBoardBinary(board.firmwareFileName, fileName)) {
				name = board.firmwareFileName;
				canAddresses.push(board.canAddress ?? 0);
			}
		}
		return name === null ? null : { name, canAddresses };
	}

	function findBoardBinary(ctx: ClassifyContext, key: "iapFileNameSBC" | "iapFileNameSD",
		fileName: string): string | null
	{
		const value = ctx.mainboard ? ctx.mainboard[key] : null;
		return (typeof value === "string" && value.length > 0 && matchesBoardBinary(value, fileName)) ? value : null;
	}

	function isWebFile(fileName: string): boolean {
		const lower = fileName.toLowerCase();
		if (webExtensions.some((ext) => lower.endsWith(ext))) {
			return true;
		}
		if (lower === "manifest.json" || lower === "manifest.json.gz" || lower === "robots.txt") {
			return true;
		}
		// .css.gz / .js.gz / ... - strip the trailing .gz and re-check
		const matches = /(\.[^.]+)\.gz$/i.exec(lower);
		return matches !== null && webExtensions.includes(matches[1]);
	}

	// Walk a single zip and return the contained files, skipping directory entries. Plugin
	// bundles (anything containing plugin.json) bail out via a thrown sentinel so the caller can
	// hand them to the plugin pipeline instead
	async function expandZip(file: File): Promise<Array<File>> {
		const { default: JSZipLib } = await import("jszip");
		let archive: JSZip;
		try {
			archive = await JSZipLib.loadAsync(file, { checkCRC32: true });
		} catch (e) {
			throw new ZipExtractionError(file.name, e);
		}

		let isPlugin = false;
		archive.forEach((relativePath: string) => {
			if (relativePath === "plugin.json") {
				isPlugin = true;
			}
		});
		if (isPlugin) {
			throw new PluginBundleDetectedError(file, archive);
		}

		const entries: Array<File> = [];
		const promises: Array<Promise<void>> = [];
		archive.forEach((relativePath: string, entry: JSZipObject) => {
			if (entry.dir) {
				return;
			}
			promises.push((async () => {
				const blob = await entry.async("blob");
				entries.push(new File([blob], relativePath));
			})());
		});
		try {
			await Promise.all(promises);
		} catch (e) {
			throw new ZipExtractionError(file.name, e);
		}
		return entries;
	}

	// Resolve a single file to its destination path and side-effects. Returns null when the file
	// was consumed by another pipeline (e.g. dispatched directly to installSystemPackage); in
	// that case the caller should not include it in the upload list
	async function classify(file: File, ctx: ClassifyContext, plan: FirmwareUpdatePlan): Promise<string | null> {
		const name = file.name;

		// SBC .deb files are handed straight to installSystemPackage - they never sit on the SD
		// card. Same for a system package bundle, which the caller already extracted; we'd reach
		// this branch via that nested expansion
		if (ctx.hasSbc && /\.deb$/i.test(name)) {
			await machineStore.installSystemPackage(name, file);
			return null;
		}

		// Volume-prefixed paths drop straight onto the volume
		if (Path.isSdPath("/" + name)) {
			return Path.combine("0:/", name);
		}

		if (isWebFile(name)) {
			plan.webInterfaceTouched = plan.webInterfaceTouched || /index\.html(\.gz)?/i.test(name);
			return Path.combine(ctx.directories.web, name);
		}

		const firmware = findFirmwareName(ctx, name);
		if (firmware) {
			for (const canAddress of firmware.canAddresses) {
				if (!plan.firmwareBoards.includes(canAddress)) {
					plan.firmwareBoards.push(canAddress);
				}
			}
			return Path.combine(ctx.directories.firmware, firmware.name);
		}

		if (ctx.hasSbc) {
			const iapSbc = findBoardBinary(ctx, "iapFileNameSBC", name);
			if (iapSbc) {
				return Path.combine(ctx.directories.firmware, iapSbc);
			}
		}

		const iapSd = findBoardBinary(ctx, "iapFileNameSD", name);
		if (iapSd) {
			return Path.combine(ctx.directories.firmware, iapSd);
		}

		// WiFi server / display binaries are matched against board metadata too
		if (!ctx.hasSbc && ctx.hasWifi) {
			if (ctx.mainboard !== null && ctx.mainboard.wifiFirmwareFileName === name) {
				plan.wifiServer = true;
				return Path.combine(ctx.directories.firmware, name);
			}
		}

		if (/\.bin$/i.test(name) || /\.uf2$/i.test(name)) {
			if (panelDueDisplays.has(name)) {
				plan.display = true;
			}
			return Path.combine(ctx.directories.firmware, name);
		}

		// Fallback - everything else goes into the system directory of the active context
		// (config files, JSON descriptors, etc.)
		return Path.combine(ctx.directories.system, name);
	}

	/**
	 * Plan an install for a set of user-picked files. Zip archives are expanded transparently; a
	 * thrown {@link PluginBundleDetectedError} signals that the input was a plugin and the caller
	 * should route it through the plugin install pipeline instead.
	 */
	async function planFiles(files: Array<File>): Promise<FirmwareUpdatePlan> {
		const ctx = buildContext();
		const plan: FirmwareUpdatePlan = {
			files: [],
			webInterfaceTouched: false,
			configReplaced: false,
			firmwareBoards: [],
			wifiServer: false,
			display: false,
		};

		const expanded: Array<File> = [];

		for (const file of files) {
			if (/\.zip$/i.test(file.name)) {
				if (ctx.hasSbc && systemPackageBundle.test(file.name)) {
					await machineStore.installSystemPackage(file.name, file);
					continue;
				}
				const inner = await expandZip(file);
				expanded.push(...inner);
			} else {
				expanded.push(file);
			}
		}

		for (const file of expanded) {
			const destination = await classify(file, ctx, plan);
			if (destination === null) {
				continue;
			}
			plan.files.push({ filename: destination, content: file });

			// config.g always warrants the reset prompt; board.txt only on a non-Duet mainboard, since
			// genuine Duet boards never read board.txt
			if (Path.isConfigFile(destination, ctx.directories.system) || (destination === Path.boardFile && !ctx.mainboardIsGenuineDuet)) {
				plan.configReplaced = true;
			}
		}

		return plan;
	}

	function hasPendingUpdates(plan: FirmwareUpdatePlan): boolean {
		return plan.firmwareBoards.length > 0 || plan.wifiServer || plan.display;
	}

	/**
	 * Issue the M997 sequence for the planned modules, then wait for the machine to leave the
	 * "updating" state. Errors other than DisconnectedError surface as console warnings +
	 * notifications - a lost connection is normal mid-update.
	 */
	async function runUpdate(plan: FirmwareUpdatePlan): Promise<void> {
		machineStore.boardsBeingUpdated = [...plan.firmwareBoards];

		// A main-board or WiFi-server reflash drops the HTTP connection mid-update, so DWC can only
		// reload once the board serves the new bundle again. Arm a reload that the machine store fires
		// on reconnect, and set it before the first M997 - a fast reboot could otherwise reconnect
		// before the flag is in place and miss it. Only reload for the host we are rendering for
		const reloadDwc = plan.webInterfaceTouched && machineStore.connector?.hostname === location.host;
		const connectionDrops = plan.firmwareBoards.includes(0) || plan.wifiServer;
		if (reloadDwc && connectionDrops) {
			machineStore.reloadAfterReconnect = true;
		}

		// Expansion boards first, one M997 per CAN address
		for (const canAddress of plan.firmwareBoards) {
			if (canAddress > 0) {
				machineStore.boardBeingUpdated = canAddress;
				try {
					await machineStore.sendCode(`M997 B${canAddress}`);
					await waitForUpdate();
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						console.warn(e);
						uiStore.notifyError(e, i18n.global.t("generic.error"));
					}
				}
			}
		}

		// Main board + ancillary modules combined into a single M997 Sa:b:c
		const modules: Array<number> = [];
		if (plan.firmwareBoards.includes(0)) {
			modules.push(0);
		}
		if (plan.wifiServer) {
			modules.push(1);
		}
		// Modules 2 (WiFi SPIFFS) and 3 (WiFi bootloader) are intentionally not exposed here
		if (plan.display) {
			modules.push(4);
		}

		if (modules.length > 0) {
			machineStore.boardBeingUpdated = 0;
			try {
				await machineStore.sendCode(`M997 S${modules.join(":")}`);
				await waitForUpdate();
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					uiStore.notifyError(e, i18n.global.t("generic.error"));
				}
			}
		}

		machineStore.boardBeingUpdated = -1;
		machineStore.boardsBeingUpdated = [];

		// Expansion-/display-only reflashes keep the HTTP connection up, so no reconnect will fire the
		// armed reload - refresh straight away to pick up the new bundle
		if (reloadDwc && !connectionDrops) {
			location.reload();
		}
	}

	// Poll every 2 s until the firmware reports a non-updating status. Sleeps first so we give
	// the board a moment to even enter the updating state - polling immediately would otherwise
	// observe the pre-M997 status and exit early. The loop also exits when the connection drops,
	// which is the expected path for a main-board reflash
	async function waitForUpdate(): Promise<void> {
		do {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			if (!machineStore.isConnected) {
				return;
			}
		} while (machineStore.model.state.status === MachineStatus.updating);
	}

	return {
		planFiles,
		hasPendingUpdates,
		runUpdate,
	};
}

/**
 * Thrown by planFiles() when the input is a plugin zip (contains plugin.json). The caller should
 * call machineStore.installPlugin() with the captured fields instead of routing the file through
 * the firmware install pipeline.
 */
export class PluginBundleDetectedError extends Error {
	public readonly file: File;
	public readonly archive: JSZip;

	constructor(file: File, archive: JSZip) {
		super(`File ${file.name} is a plugin bundle`);
		this.name = "PluginBundleDetectedError";
		this.file = file;
		this.archive = archive;
	}
}
