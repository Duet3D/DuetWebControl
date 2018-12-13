<template>
	<v-dialog v-model="shown" persistent width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="connect">
				<v-card-title>
					<span class="headline">{{ $t('dialog.connect.title') }}</span>
				</v-card-title>

				<v-card-text>
					{{ $t('dialog.connect.prompt') }}
					<v-text-field ref="hostname" :placeholder="$t('dialog.connect.placeholder')" v-model="hostname" :rules="[v => !!v || $t('dialog.connect.hostRequired')]" required></v-text-field>
				</v-card-text>

				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn color="blue darken-1" flat @click="hide">{{ $t('generic.cancel') }}</v-btn>
					<v-btn color="blue darken-1" flat type="submit">{{ $t('dialog.connect.connect') }}</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapActions } from 'vuex'

export default {
	props: {
		shown: {
			type: Boolean,
			required: true
		}
	},
	data() {
		return {
			hostname: ''
		}
	},
	methods: {
		...mapActions({
			connectMachine: 'connect'
		}),
		connect() {
			if (this.$refs.form.validate()) {
				this.hide();
				this.connectMachine({ hostname: this.hostname });
			}
		},
		hide() {
			this.$emit('update:shown', false);
		}
	},
	watch: {
		shown(to) {
			if (to) {
				// Auto-focus hostname input
				const input = this.$refs.hostname;
				setTimeout(function() { input.focus(); }, 100);
			}
		}
	}
}
</script>
