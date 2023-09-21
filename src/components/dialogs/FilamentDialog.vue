<template>
	<v-dialog v-model="shown" persistent width="360" @keydown.escape="hide">
		<v-card>
			<v-card-title class="headline">
				{{ $t(tool ? (tool.filament ? "dialog.filament.titleChange" : "dialog.filament.titleLoad") : "generic.noValue") }}
			</v-card-title>

			<v-card-text>
				{{ $t(filaments.length > 0 ? "dialog.filament.prompt" : "dialog.filament.noFilaments") }}

				<v-progress-linear indeterminate v-if="loading" />
				<v-list v-if="!loading">
					<v-list-item v-for="filament in filaments" :key="filament" @click="filamentClick(filament)">
						<v-icon class="mr-1">mdi-radiobox-marked</v-icon> {{ filament }}
					</v-list-item>
				</v-list>
			</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn color="blue darken-1" text @click="hide">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-spacer />
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { mapState } from "pinia";
import Vue from "vue";

import { DisconnectedError, getErrorMessage } from "@/utils/errors"
import { LogType, log } from "@/utils/logging";
import { useMachineStore } from "@/store/machine";

export default Vue.extend({
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		tool: Object
	},
	data() {
		return {
			filaments: new Array<string>(),
			loading: false
		}
	},
	methods: {
		async loadFilaments() {
			if (this.loading) {
				return;
			}
			const machineStore = useMachineStore();

			this.loading = true
			try {
				const response = await machineStore.getFileList(machineStore.model.directories.filaments);
				const filaments = response.filter(item => item.isDirectory).map(item => item.name);
				filaments.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
				this.filaments = filaments;
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					log(LogType.error, this.$t("error.filamentsLoadFailed"), getErrorMessage(e));
				}
				this.hide();
			}
			this.loading = false;
		},
		async filamentClick(filament: string) {
			this.hide();

			const machineStore = useMachineStore();
			let code = "";
			if (machineStore.currentTool !== this.tool) {
				// Select tool first
				code = `T${this.tool.number}\n`;
			}

			if (this.tool.filamentExtruder >= 0 && this.tool.filamentExtruder < machineStore.model.move.extruders.length &&
				machineStore.model.move.extruders[this.tool.filamentExtruder].filament) {
				// Unload current filament, normally this should not be necessary
				code += "M702\n";
			}

			// Run load sequence and configure current tool for it
			code += `M701 S"${filament}"\nM703`;
			await machineStore.sendCode(code);
		},
		hide() {
			this.$emit("update:shown", false);
		}
	},
	watch: {
		shown(to: boolean) {
			if (to) {
				// Load filaments when this dialog is shown
				this.loadFilaments();
			}
		}
	}
});
</script>
