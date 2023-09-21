<template>
	<input-dialog :shown.sync="innerShown" :title="title || $t('dialog.newDirectory.title')"
				  :prompt="prompt || $t('dialog.newDirectory.prompt')" @confirmed="createDirectory" />
</template>

<script lang="ts">
import { mapState } from "pinia";
import Vue from "vue";

import { DisconnectedError, getErrorMessage } from "@/utils/errors";
import { LogType } from "@/utils/logging";
import Path from "@/utils/path";
import { useMachineStore } from "@/store/machine";
import { makeNotification } from "@/utils/notifications";

export default Vue.extend({
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		directory: {
			type: String,
			required: true
		},
		title: String,
		prompt: String,
		showSuccess: {
			type: Boolean,
			default: true
		},
		showError: {
			type: Boolean,
			default: true
		}
	},
	computed: mapState(useMachineStore, ["isConnected"]),
	data() {
		return {
			innerShown: this.shown
		}
	},
	methods: {
		async createDirectory(directory: string) {
			const currentDirectory = this.directory;
			try {
				const path = Path.combine(currentDirectory, directory), machineStore = useMachineStore();
				await machineStore.makeDirectory(path);

				this.$emit("directoryCreated", path);
				if (this.showSuccess) {
					makeNotification(LogType.success, this.$t("notification.newDirectory.successTitle"), this.$t("notification.newDirectory.successMessage", [directory]));
				}
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					if (this.showError) {
						makeNotification(LogType.error, this.$t("notification.newDirectory.errorTitle"), getErrorMessage(e));
					}
				}
			}
		}
	},
	watch: {
		isConnected(to: boolean) {
			if (!to) {
				this.innerShown = false;
			}
		},
		innerShown(to: boolean) {
			if (this.shown !== to) {
				this.$emit("update:shown", to);
			}
		},
		shown(to: boolean) {
			if (this.innerShown !== to) {
				this.innerShown = to;
			}
		}
	}
});
</script>
