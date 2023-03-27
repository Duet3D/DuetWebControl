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
import semver from "semver";
import Vue from "vue";

import packageInfo from "../../../package.json";
import store from "@/store";
import { LogType } from "@/utils/logging";

export default Vue.extend({
	computed: {
		isConnecting(): boolean { return store.state.isConnecting || store.state.machine.isReconnecting; },
		upgradeDocs(): string { return (store.state.machine.model.state.dsfVersion !== null) ? "https://docs.duet3d.com/en/User_manual/Machine_configuration/SBC_setup" : "https://docs.duet3d.com/en/User_manual/RepRapFirmware/Updating_firmware" }
	},
	data() {
		return {
			shown: false
		}
	},
	methods: {
		checkVersions() {
			if (store.state.machine.settings.checkVersions) {
				let versionMismatch = false;
				try {
					const mainboardVersion = store.state.machine.model.boards.find(board => !board.canAddress)?.firmwareVersion;
					if (mainboardVersion) {
						// Check expansion board firmware versions
						for (const board of store.state.machine.model.boards) {
							if (board.canAddress && semver.compare(mainboardVersion, board.firmwareVersion) !== 0) {
								versionMismatch = true;
							}
						}

						// Check DSF version
						if (!versionMismatch && store.state.machine.model.state.dsfVersion !== null) {
							versionMismatch = semver.compare(mainboardVersion, store.state.machine.model.state.dsfVersion) !== 0;
						}

						// Check DWC version
						if (!versionMismatch) {
							versionMismatch = semver.compare(mainboardVersion, packageInfo.version) !== 0;
						}
					}

					this.shown = versionMismatch;
					if (versionMismatch) {
						this.$log(LogType.warning, this.$t("dialog.incompatibleVersions.title"), this.$t("dialog.incompatibleVersions.prompt"));
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
