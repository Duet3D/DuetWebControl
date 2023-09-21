<style scoped>
th {
	padding: 0 16px;
	text-align: left;
}
</style>

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

		<v-simple-table v-if="isConnected">
			<thead>
				<th>
					{{ "Product" }}
				</th>
				<th>
					{{ "Short Name" }}
				</th>
				<th>
					{{ "Version" }}
				</th>
			</thead>
			<tbody>
				<!-- Boards -->
				<tr v-for="(board, index) in boards" :key="index">
					<td>
						{{ board.name }}
					</td>
					<td>
						{{ board.shortName }}
					</td>
					<td :title="$t('panel.settingsAbout.buildDateTime', [board.firmwareDate])">
						{{ board.firmwareVersion }}
					</td>
				</tr>

				<!-- WiFi Server-->
				<tr v-if="wifiVersion !== null">
					<td>
						Duet WiFi Server
					</td>
					<td>
						{{ $t("generic.noValue") }}
					</td>
					<td>
						{{ wifiVersion }}
					</td>
				</tr>

				<!-- DSF-->
				<tr v-if="dsfVersion !== null"> <!-- TODO add build date here when dsf key is added -->
					<td>
						Duet Software Framework
					</td>
					<td>
						DSF
					</td>
					<td>
						{{ dsfVersion }}
					</td>
				</tr>

				<!-- DWC -->
				<tr>
					<td>
						Duet Web Control
					</td>
					<td>
						DWC
					</td>
					<td :title="$t('panel.settingsAbout.buildDateTime', [buildDateTime])">
						{{ dwcVersion }}
					</td>
				</tr>
			</tbody>
		</v-simple-table>
		<v-card-text v-else>
			{{ $t("panel.settingsElectronics.notConnected") }}
		</v-card-text>

		<upload-btn v-if="!isRestConnector || !isDuetFirmware" class="my-3 d-flex justify-center" target="update" color="primary" />
	</v-card>
</template>

<script lang="ts">
import { NetworkInterfaceType } from "@duet3d/objectmodel";
import { mapState } from "pinia";
import { defineComponent } from "vue";

import packageInfo from "../../../package.json";
import RestConnector from "@/store/connector/RestConnector";
import { useMachineStore } from "@/store/machine";

export default defineComponent({
	computed: {
		...mapState(useMachineStore, {
			isConnected: state => state.isConnected,
			isRestConnector: state => state.connector instanceof RestConnector,
			boards: state => state.model.boards,
			isDuetFirmware: state => state.model.boards.some(board => !board.canAddress && board.firmwareFileName.startsWith("Duet")),
			dsfVersion: state => state.model.sbc?.dsf.version ?? null,
            wifiVersion: state => state.model.network.interfaces.find(iface => iface.type === NetworkInterfaceType.wifi)?.firmwareVersion ?? null
		}),
	},
	data() {
		return {
			buildDateTime: process.env.BUILD_DATETIME,
			dwcVersion: packageInfo.version
		}
	},
	methods: {
		async diagnostics() {
			await useMachineStore().sendCode("M122");
			await this.$router.push("/Console");
		}
	}
});
</script>
