// Shared firmware-install controller used by FileList. When a parent (e.g. Explorer) provides
// one via Vue's provide/inject the child FileLists share a single dialog mount instead of each
// hosting its own pair. A standalone FileList (Jobs page, Settings page's firmware button) just
// instantiates its own and hosts the dialogs locally
//
// The controller owns:
//   - the firmware-install pipeline state (which files to upload, which boards need M997)
//   - the FirmwareUpdateDialog + ConfigUpdatedDialog shown/plan state
//   - the post-upload event flow (confirm, cancel, config-reset prompt)
//
// Callers call runFirmwareUpload(files) after the user picks files; the controller takes over,
// plans the install, uploads, opens the dialog if updates are needed, runs M997 on confirmation
// and prompts for a firmware reset when config.g was replaced

import { OperationCancelledError, PollConnector, RestConnector } from "@duet3d/connectors";
import type { InjectionKey } from "vue";

import { type FirmwareUpdatePlan, PluginBundleDetectedError, useFirmwareInstall } from "@/composables/useFirmwareInstall";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";
import { ZipExtractionError } from "@/utils/errors";
import Events from "@/utils/events";

export interface FirmwareInstallController {
	runFirmwareUpload(files: Array<File>): Promise<void>;
	firmwareDialog: { shown: boolean; plan: FirmwareUpdatePlan | null };
	configUpdatedDialog: { shown: boolean };
	onFirmwareUpdateConfirmed(): Promise<void>;
	onFirmwareUpdateCancelled(): void;
}

/**
 * Inject key for the provide/inject channel. When a parent component provides a controller,
 * descendant FileLists will pick it up via inject() and skip hosting their own dialog instances.
 * Use {@link useFirmwareInstallController} in the parent and pass the result to provide().
 */
export const firmwareInstallControllerKey: InjectionKey<FirmwareInstallController> =
	Symbol("firmwareInstallController");

/**
 * Build a fresh controller. The caller is responsible for hosting the FirmwareUpdateDialog +
 * ConfigUpdatedDialog and binding them to {@link FirmwareInstallController.firmwareDialog} /
 * {@link FirmwareInstallController.configUpdatedDialog} respectively
 */
export function useFirmwareInstallController(): FirmwareInstallController {
	const machineStore = useMachineStore();
	const uiStore = useUiStore();
	const firmwareInstall = useFirmwareInstall();

	const firmwareDialog = reactive<{ shown: boolean; plan: FirmwareUpdatePlan | null }>({
		shown: false,
		plan: null,
	});
	const configUpdatedDialog = reactive({ shown: false });

	async function runFirmwareUpload(files: Array<File>) {
		// DWC release bundles are board-type specific: DuetWebControl-SD.zip carries the www assets
		// for a standalone install, DuetWebControl-SBC.zip is the DSF package updated through apt.
		// Uploading the wrong one for the current mode would scatter files where they do nothing, so
		// reject the mismatch before any extraction or upload happens. The transport decides which
		// bundle fits - RestConnector is SBC mode, PollConnector is standalone
		const connector = machineStore.connector;
		for (const file of files) {
			const name = file.name.toLowerCase();
			if (connector instanceof RestConnector && name === "duetwebcontrol-sd.zip") {
				uiStore.log(LogLevel.error, i18n.global.t("notification.decompress.wrongBundleTitle"), i18n.global.t("notification.decompress.standaloneUpdateInSbcModeError"));
				return;
			}
			if (connector instanceof PollConnector && name === "duetwebcontrol-sbc.zip") {
				uiStore.log(LogLevel.error, i18n.global.t("notification.decompress.wrongBundleTitle"), i18n.global.t("notification.decompress.sbcUpdateInStandaloneError"));
				return;
			}
		}

		let plan: FirmwareUpdatePlan;
		try {
			plan = await firmwareInstall.planFiles(files);
		} catch (e) {
			if (e instanceof PluginBundleDetectedError) {
				// Detour into the install wizard so the user sees the manifest preview /
				// prerequisites check / disclaimer before the bundle reaches the machine.
				// PluginInstallDialog listens for this event and opens the modal
				Events.emit("installPlugin", { zipFilename: e.file.name, zipBlob: e.file, zipFile: e.archive, start: true });
				return;
			}
			if (e instanceof OperationCancelledError) {
				return;
			}
			console.warn(e);
			// SBC package installs are dispatched from the classifier and report their own failures.
			// Anything else planFiles() can throw (a malformed zip, an unexpected error while
			// classifying a file, ...) must still reach the user - silently swallowing it here made
			// picking a file look like a complete no-op, with nothing to explain why
			uiStore.notifyError(e, e instanceof ZipExtractionError
				? i18n.global.t("notification.decompress.errorTitle")
				: i18n.global.t("notification.firmwareInstall.planFailedTitle"));
			return;
		}

		try {
			if (plan.files.length > 0) {
				// Auto-dismiss the transfer progress dialog when a follow-up prompt is about to replace it
				await machineStore.upload(plan.files, true, true, true, firmwareInstall.hasPendingUpdates(plan) || plan.configReplaced);
			}

			if (firmwareInstall.hasPendingUpdates(plan)) {
				firmwareDialog.plan = plan;
				firmwareDialog.shown = true;
				return;
			}

			maybePromptConfigReset(plan);

			// Auto-reload DWC after a www-only refresh of the same host
			if (plan.webInterfaceTouched && machineStore.connector?.hostname === location.host) {
				location.reload();
				return;
			}

			// Nothing recognisable came out of this pick: classify() always finds SOME destination
			// for a non-.deb file, so it landed on the SD card, but none of the branches above fired -
			// it didn't match any connected board's firmwareFileName, a WiFi/display module, or a
			// config file, so no M997 was queued and no reset prompt showed. Without this the whole
			// pick looks like a no-op (a brief upload toast and then nothing) - most commonly because
			// the picked file's name doesn't match what the connected board reports as its own
			// firmwareFileName
			if (plan.files.length > 0 && !plan.configReplaced && !plan.webInterfaceTouched) {
				uiStore.log(LogLevel.warning, i18n.global.t("notification.firmwareInstall.notRecognisedTitle"),
					i18n.global.t("notification.firmwareInstall.notRecognisedMessage"));
			}
		} catch (e) {
			// upload() notifies about every file it failed to transfer, so no extra message here
			if (!(e instanceof OperationCancelledError)) {
				console.warn(e);
			}
		}
	}

	async function onFirmwareUpdateConfirmed() {
		const plan = firmwareDialog.plan;
		firmwareDialog.plan = null;
		if (!plan) {
			return;
		}
		try {
			await firmwareInstall.runUpdate(plan);
		} finally {
			maybePromptConfigReset(plan, true);
		}
	}

	function onFirmwareUpdateCancelled() {
		const plan = firmwareDialog.plan;
		firmwareDialog.plan = null;
		if (plan) {
			maybePromptConfigReset(plan);
		}
	}

	// Decide whether to offer a reset / config re-run. The trigger depends on whether an M997 sequence
	// actually ran:
	//   - No update ran (plain config upload, or the user cancelled the update): prompt when config.g
	//     or board.txt was replaced, so the new configuration gets applied.
	//   - An update ran: a main-board reflash reboots and reruns config.g on its own, so only prompt
	//     when expansion/tool boards were reflashed without the main board - those CAN boards rebooted
	//     into new firmware and need M999 or a config.g re-run to be reinitialised
	function maybePromptConfigReset(plan: FirmwareUpdatePlan, updateRan = false) {
		if (isPrinting(machineStore.model.state.status)) {
			return;
		}
		const shouldPrompt = updateRan
			? !plan.firmwareBoards.includes(0) && plan.firmwareBoards.some((canAddress) => canAddress > 0)
			: plan.configReplaced;
		if (shouldPrompt) {
			configUpdatedDialog.shown = true;
		}
	}

	return {
		runFirmwareUpload,
		firmwareDialog,
		configUpdatedDialog,
		onFirmwareUpdateConfirmed,
		onFirmwareUpdateCancelled,
	};
}
