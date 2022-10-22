<template>
	<v-card outlined>
		<v-card-title>
			{{ $t("panel.settingsElectronics.caption") }}

			<v-spacer />

			<a v-show="isConnected" href="javascript:void(0)" @click="diagnostics">
				<v-icon small>mdi-lifebuoy</v-icon>
				{{ $t('panel.settingsElectronics.diagnostics') }}
			</a>
		</v-card-title>

		<v-card-text class="pt-0">
			<template v-if="isConnected">
				<template v-if="mainboard !== null">
					{{ $t("panel.settingsElectronics.board", [mainboard.name + (mainboard.shortName ? ` (${mainboard.shortName})` : "")]) }}
					<br>
					{{ $t("panel.settingsElectronics.firmware", [$display(mainboard.firmwareName) + " " + $display(mainboard.firmwareVersion), $display(mainboard.firmwareDate)]) }}
					<br>
				</template>
				<template v-if="dsfVersion !== null">
					{{ $t("panel.settingsElectronics.dsfVersion", [dsfVersion]) }}
					<br>
				</template>
				<template v-if="wifiVersion !== null">
					{{ $t("panel.settingsElectronics.dwsFirmware", [wifiVersion]) }}
					<br>
				</template>

				<upload-btn v-if="!isRestConnector || !isDuetFirmware" target="update" color="primary"
							class="mt-3 d-flex justify-center" />
			</template>
			<template v-else>
				{{ $t("panel.settingsElectronics.notConnected") }}
			</template>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";
import RestConnector from "@/store/machine/connector/RestConnector";
import { Board, NetworkInterfaceType } from "@duet3d/objectmodel";

export default Vue.extend({
	computed: {
		isConnected(): boolean { return store.getters["isConnected"]; },
		isRestConnector(): boolean { return store.getters["machine/connector"] instanceof RestConnector; },
		mainboard(): Board | null { return store.state.machine.model.boards.find(board => !board.canAddress) ?? null; },
		isDuetFirmware(): boolean { return (this.mainboard !== null) ? this.mainboard.firmwareFileName.startsWith("Duet") : true; },
		dsfVersion(): string | null { return store.state.machine.model.state.dsfVersion; },
		wifiVersion(): string | null { return store.state.machine.model.network.interfaces.find(iface => iface.type === NetworkInterfaceType.wifi)?.firmwareVersion ?? null; },
	},
	methods: {
		async diagnostics() {
			await store.dispatch("machine/sendCode", "M122");
			await this.$router.push("/Console");
		}
	}
});
</script>
