<template>
	<v-dialog v-model="internalShown" @keydown.escape="dismissed" persistent width="720">
		<v-card>
			<v-card-title>
				<span class="headline">
					{{ $t("dialog.update.title") }}
				</span>
			</v-card-title>

			<v-card-text>
				{{ $t("dialog.update.prompt") }}

				<v-checkbox v-if="includesWiFiFirmware" :input-value="updateWiFiFirmware"
							@change="$emit('update:updateWiFiFirmware', $event)"
							:label="$t('dialog.update.updateWiFiFirmware')" class="mt-3" hide-details />

				<v-alert :value="!!dsfVersion && isDuetFirmware" type="warning" class="mt-3">
					{{ $t("dialog.update.sbcWarning") }}
				</v-alert>
			</v-card-text>

			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn color="blue darken-1" text @click="dismissed">
					{{ $t("generic.no") }}
				</v-btn>
				<v-btn color="blue darken-1" text @click="confirmed">
					{{ $t("generic.yes") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	props: {
		multipleUpdates: Boolean,
		updateWiFiFirmware: Boolean,
		shown: {
			type: Boolean,
			required: true
		}
	},
	computed: {
		isDuetFirmware(): boolean {
			return (store.state.machine.model.boards.length > 0 && store.state.machine.model.boards[0].firmwareFileName) ? store.state.machine.model.boards[0].firmwareFileName.startsWith("Duet") : true;
		},
		dsfVersion(): string | null {
			return store.state.machine.model.sbc?.dsf.version ?? null;
		},
		internalShown: {
			get(): boolean { return this.shown; },
			set(value: boolean) {
				if (value) {
					this.confirmed();
				} else {
					this.dismissed();
				}
			}
		}
	},
	data() {
		return {
			includesWiFiFirmware: false
		}
	},
	methods: {
		confirmed() {
			this.$emit("confirmed");
			this.$emit("update:shown", false);
		},
		dismissed() {
			this.$emit("dismissed");
			this.$emit("update:shown", false);
		}
	},
	watch: {
		shown(value: boolean) {
			if (value) {
				this.includesWiFiFirmware = this.multipleUpdates && this.updateWiFiFirmware;
			}
		}
	}
});
</script>
