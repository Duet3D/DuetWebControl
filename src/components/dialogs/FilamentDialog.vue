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
import { Tool } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";

import { FileListItem } from "@/store/machine/connector/BaseConnector";
import { DisconnectedError, getErrorMessage } from "@/utils/errors"

export default Vue.extend({
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		tool: Object
	},
	computed: {
		currentTool(): Tool { return store.getters["machine/model/currentTool"]; }
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

			this.loading = true
			try {
				const response: Array<FileListItem> = await store.dispatch("machine/getFileList", store.state.machine.model.directories.filaments);
				this.filaments = response.filter(item => item.isDirectory).map(item => item.name);
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					this.$log("error", this.$t("error.filamentsLoadFailed"), getErrorMessage(e));
				}
				this.hide();
			}
			this.loading = false;
		},
		async filamentClick(filament: string) {
			this.hide();

			let code = "";
			if (this.currentTool !== this.tool) {
				// Select tool first
				code = `T${this.tool.number}\n`;
			}
			if (this.tool.filamentExtruder >= 0 && this.tool.filamentExtruder < store.state.machine.model.move.extruders.length &&
				store.state.machine.model.move.extruders[this.tool.filamentExtruder].filament) {
				// Unload current filament
				code += "M702\n";
			}
			// Run load sequence and configure current tool for it
			// TODO Make M703 configurable
			code += `M701 S"${filament}"\nM703`;
			await store.dispatch("machine/sendCode", code);
		},
		hide() {
			this.$emit("update:shown", false);
		}
	},
	watch: {
		shown(to) {
			if (to) {
				// Load filaments when this dialog is shown
				this.loadFilaments();
			}
		}
	}
});
</script>
