<template>
	<v-dialog v-model="shown" persistent no-click-animation width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="submit">
				<v-card-title class="headline">
					{{ $t("dialog.connect.title") }}
				</v-card-title>

				<v-card-text>
					{{ $t("dialog.connect.prompt") }}

					<v-text-field v-show="!passwordRequired" v-model="hostname" :autofocus="!passwordRequired"
								  :placeholder="$t('dialog.connect.hostPlaceholder')" :rules="hostnameRules" required />
					<v-text-field type="password"
								  :placeholder="$t(passwordRequired ? 'dialog.connect.passwordPlaceholder' : 'dialog.connect.passwordPlaceholderOptional')"
								  v-model="password" :autofocus="passwordRequired" :rules="passwordRules"
								  :required="passwordRequired" />
				</v-card-text>

				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn v-show="!passwordRequired" color="blue darken-1" text @click="close">
						{{ $t("generic.cancel") }}
					</v-btn>
					<v-btn color="blue darken-1" text type="submit">
						{{ $t("dialog.connect.connect") }}
					</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { mapState } from "pinia";
import Vue from "vue";

import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";
import { useSettingsStore } from "@/store/settings";

export default Vue.extend({
	computed: {
		...mapState(useMachineStore, ["passwordRequired"]),
		...mapState(useSettingsStore, ["lastHostname"]),
		...mapState(useUiStore, ["showConnectDialog"])
	},
	data() {
		return {
			hostname: location.host,
			hostnameRules: [
				(value: string): string | boolean => value ? true : this.$t("dialog.connect.hostRequired")
			],
			password: "",
			passwordRules: [
				(value: string): string | boolean => (!value && useMachineStore().passwordRequired) ? this.$t("dialog.connect.passwordRequired") : true
			],
			shown: false
		}
	},
	methods: {
		async submit() {
			if (this.shown && (this.$refs.form as HTMLFormElement).validate()) {
				this.close();

				try {
					await useMachineStore().connect(this.hostname, undefined, this.password);
					this.password = "";
				} catch (e) {
					console.warn(e);
					useUiStore().showConnectDialog = true;
				}
			}
		},
		close() {
			useUiStore().showConnectDialog = false;
		}
	},
	mounted() {
		this.hostname = this.passwordRequired ? location.host : this.lastHostname;
		this.shown = this.showConnectDialog;
	},
	watch: {
		showConnectDialog(to: boolean) { this.shown = to; },
		lastHostname(to: string) { this.hostname = to; }
	}
});
</script>
