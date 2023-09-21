<template>
	<v-dialog v-model="shown" max-width="480">
		<v-card>
			<v-card-title class="headline">
				<v-icon class="mr-1">mdi-alert</v-icon> {{ $t("dialog.incompatibleVersions.title") }}
			</v-card-title>

			<v-card-text>
				<p>
					{{ $t("dialog.incompatibleVersions.prompt") }}
				</p>
				<i18n tag="p" path="dialog.incompatibleVersions.upgradeNotice" class="mb-0">
					<template #docs>
						<a :href="upgradeDocs" target="_blank">docs</a>
					</template>
				</i18n>
			</v-card-text>

			<v-card-actions>
				<v-btn color="blue darken1" class="mx-auto" text @click="shown = false">
					{{ $t("generic.ok") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { mapState } from "pinia";
import semver from "semver";
import Vue from "vue";

import packageInfo from "../../../package.json";
import { useMachineStore } from "@/store/machine";
import { useSettingsStore } from "@/store/settings";
import { LogType, log, logToConsole } from "@/utils/logging";

export default Vue.extend({
	computed: mapState(useMachineStore, {
		isConnecting: state => state.isConnecting || state.isReconnecting,
		upgradeDocs: state => (state.model.sbc !== null) ? "https://docs.duet3d.com/en/User_manual/Machine_configuration/SBC_setup" : "https://docs.duet3d.com/en/User_manual/RepRapFirmware/Updating_firmware"
	}),
	data() {
		return {
			shown: false
		}
	},
	methods: {
		checkVersions() {
			const machineStore = useMachineStore(), settingsStore = useSettingsStore();
			if (settingsStore.checkVersions) {
				let versionMismatch = false, patchVersionMismatch = false;
				try {
					const mainboardVersion = machineStore.model.boards.find(board => !board.canAddress)?.firmwareVersion;
					if (mainboardVersion) {
						// Check expansion board firmware versions
						for (const board of machineStore.model.boards) {
							if (board.canAddress && board.firmwareVersion && semver.compare(mainboardVersion, board.firmwareVersion, true) !== 0) {
								console.warn(`Expansion board #${board.canAddress} version mismatch (MB ${mainboardVersion} != EXP ${board.firmwareVersion})`);
								if (semver.satisfies(board.firmwareVersion, '^' + mainboardVersion, true)) {
									patchVersionMismatch = true;
								} else {
									versionMismatch = true;
								}
							}
						}

						// Check DSF version
						if (!versionMismatch && machineStore.model.sbc !== null && semver.compare(mainboardVersion, machineStore.model.sbc.dsf.version, true) !== 0) {
							console.warn(`DSF version mismatch (MB ${mainboardVersion} != DSF ${machineStore.model.sbc.dsf.version})`);
							if (semver.satisfies(machineStore.model.sbc.dsf.version, '^' + mainboardVersion, true)) {
								patchVersionMismatch = true;
							} else {
								versionMismatch = true;
							}
						}

						// Check DWC version
						if (!versionMismatch && semver.compare(mainboardVersion, packageInfo.version, true) !== 0) {
							console.warn(`DWC version mismatch (MB ${mainboardVersion} != DWC ${packageInfo.version})`);
							if (semver.satisfies(packageInfo.version, '^' + mainboardVersion, true)) {
								patchVersionMismatch = true;
							} else {
								versionMismatch = true;
							}
						}
					}

					this.shown = versionMismatch;
					if (versionMismatch) {
						logToConsole(LogType.error, this.$t("dialog.incompatibleVersions.title"), this.$t("dialog.incompatibleVersions.prompt"));
					} else if (patchVersionMismatch) {
						log(LogType.warning, this.$t("dialog.incompatibleVersions.title"), this.$t("dialog.incompatibleVersions.prompt"));
					}
				} catch (e) {
					console.warn("Failed to check software versions", e);
				}
			}
		}
	},
	mounted() {
		if (!this.isConnecting) {
			this.checkVersions();
		}
	},
	watch: {
		isConnecting(to: boolean) {
			if (!to) {
				// At this point it's safe to assume that the object model is populated...
				this.checkVersions();
			}
		}
	}
});
</script>
