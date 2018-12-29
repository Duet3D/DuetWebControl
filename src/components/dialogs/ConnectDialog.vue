<template>
	<v-dialog v-model="shown" persistent width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="submit">
				<v-card-title>
					<span class="headline">{{ $t('dialog.connect.title') }}</span>
				</v-card-title>

				<v-card-text>
					{{ $t('dialog.connect.prompt') }}
					<v-text-field v-if="!mustConnect" ref="hostname" v-model="hostname" :placeholder="$t('dialog.connect.hostPlaceholder')" :rules="[v => !!v || $t('dialog.connect.hostRequired')]" required></v-text-field>
					<v-text-field ref="password" type="password" :placeholder="$t(passwordRequired ? 'dialog.connect.passwordPlaceholder' : 'dialog.connect.passwordPlaceholderOptional')" v-model="password" :rules="[v => !!v || !passwordRequired || $t('dialog.connect.passwordRequired')]" :required="passwordRequired"></v-text-field>
				</v-card-text>

				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn v-show="!mustConnect" color="blue darken-1" flat @click="hideConnectDialog">{{ $t('generic.cancel') }}</v-btn>
					<v-btn color="blue darken-1" flat type="submit">{{ $t('dialog.connect.connect') }}</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState, mapActions, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState(['isLocal', 'connectDialogShown', 'passwordRequired']),
		...mapState('settings', ['lastHostname']),
		mustConnect() { return !this.isLocal && !this.isConnected; }
	},
	data() {
		return {
			shown: false,
			hostname: '',
			password: ''
		}
	},
	methods: {
		...mapActions(['connect']),
		...mapMutations(['hideConnectDialog']),
		async submit() {
			if (this.shown && this.$refs.form.validate()) {
				this.hideConnectDialog();

				await this.connect({ hostname: this.hostname, password: this.password });
				this.password = '';
			}
		}
	},
	mounted() {
		this.hostname = this.lastHostname;
		this.shown = this.connectDialogShown;
	},
	watch: {
		connectDialogShown(to) { this.shown = to; },
		shown(to) {
			if (to) {
				// Fill in the last hostname
				this.hostname = this.lastHostname;

				// Auto-focus input
				const input = this.passwordRequired ? this.$refs.password : this.$refs.hostname;
				setTimeout(input.focus, 100);
			}
		}
	}
}
</script>
