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
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		connectDialogShown(): boolean { return store.state.connectDialogShown; },
		lastHostname(): string { return store.state.settings.lastHostname; },
		passwordRequired(): boolean { return store.state.passwordRequired; }
	},
	data() {
		return {
			hostname: location.host,
			hostnameRules: [
				(value: string): string | boolean => value ? true : this.$t("dialog.connect.hostRequired")
			],
			password: "",
			passwordRules: [
				(value: string): string | boolean => (!value && store.state.passwordRequired) ? this.$t("dialog.connect.passwordRequired") : true
			],
			shown: false
		}
	},
	methods: {
		async submit() {
			if (this.shown && (this.$refs.form as HTMLFormElement).validate()) {
				this.close();

				try {
					await store.dispatch("connect", {
						hostname: this.hostname,
						password: this.password
					});
					this.password = "";
				} catch (e) {
					console.warn(e);
					store.commit("showConnectDialog");
				}
			}
		},
		close() {
			store.commit("hideConnectDialog");
		}
	},
	mounted() {
		this.hostname = this.passwordRequired ? location.host : this.lastHostname;
		this.shown = this.connectDialogShown;
	},
	watch: {
		connectDialogShown(to: boolean) { this.shown = to; },
		lastHostname(to: string) { this.hostname = to; }
	}
});
</script>
