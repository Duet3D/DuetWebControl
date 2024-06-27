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
						<v-tooltip v-if="board.canAddress" bottom>
							<template v-slot:activator="{ on, attrs }">
								<v-icon small v-bind="attrs" v-on="on">
									mdi-information-outline
								</v-icon>
							</template>
							<span>
								{{ $t("panel.settingsElectronics.canAddress", [board.canAddress]) }}
							</span>
						</v-tooltip>
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
				<tr v-if="dsfVersion !== null" :title="$t('panel.settingsAbout.buildDateTime', [dsfBuildDateTime])">
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

		<upload-btn v-if="!isRestConnector || !isDuetFirmware" class="my-3 d-flex justify-center" target="update"
					color="primary" />
	</v-card>
</template>

<script lang="ts">
import { Board, NetworkInterfaceType } from "@duet3d/objectmodel";
import Vue from "vue";

import packageInfo from "../../../package.json";
import store from "@/store";
import RestConnector from "@/store/machine/connector/RestConnector";

export default Vue.extend({
	computed: {
		isConnected(): boolean { return store.getters["isConnected"]; },
		isRestConnector(): boolean { return store.getters["machine/connector"] instanceof RestConnector; },
		boards(): Array<Board> { return store.state.machine.model.boards.filter(board => board !== null); },
		isDuetFirmware(): boolean { return this.boards.some(board => !board.canAddress && board.firmwareFileName.startsWith("Duet")); },
		dsfVersion(): string | null { return store.state.machine.model.sbc?.dsf.version ?? null; },
		dsfBuildDateTime(): string | null { return store.state.machine.model.sbc?.dsf.buildDateTime ?? null; },
		wifiVersion(): string | null { return store.state.machine.model.network.interfaces.find(iface => iface.type === NetworkInterfaceType.wifi)?.firmwareVersion ?? null; },
	},
	data() {
		return {
			buildDateTime: process.env.BUILD_DATETIME,
			dwcVersion: packageInfo.version
		}
	},
	methods: {
		async diagnostics() {
			await store.dispatch("machine/sendCode", "M122");
			await this.$router.push("/Console");
		}
	}
});
</script>
