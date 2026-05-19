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

import type { InjectionKey } from "vue";

import {
	type FirmwareUpdatePlan, PluginBundleDetectedError, useFirmwareInstall
} from "@/composables/useFirmwareInstall";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";
import Events from "@/utils/events";

export interface FirmwareInstallController {
	runFirmwareUpload(files: Array<File>): Promise<void>;
	firmwareDialog: { shown: boolean; plan: FirmwareUpdatePlan | null };
	configUpdatedDialog: { shown: boolean };
	onFirmwareUpdateConfirmed(choices: { wifiServerSpiffs: boolean }): Promise<void>;
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
		try {
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
				throw e;
			}

			if (plan.files.length > 0) {
				await machineStore.upload(plan.files);
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
			}
		} catch (e) {
			console.warn(e);
			uiStore.notifyError(e, i18n.global.t("notification.decompress.errorTitle"));
		}
	}

	async function onFirmwareUpdateConfirmed(choices: { wifiServerSpiffs: boolean }) {
		const plan = firmwareDialog.plan;
		firmwareDialog.plan = null;
		if (!plan) {
			return;
		}
		try {
			await firmwareInstall.runUpdate(plan, choices);
		} finally {
			maybePromptConfigReset(plan);
		}
	}

	function onFirmwareUpdateCancelled() {
		const plan = firmwareDialog.plan;
		firmwareDialog.plan = null;
		if (plan) {
			maybePromptConfigReset(plan);
		}
	}

	function maybePromptConfigReset(plan: FirmwareUpdatePlan) {
		if (plan.configReplaced && !isPrinting(machineStore.model.state.status)) {
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
