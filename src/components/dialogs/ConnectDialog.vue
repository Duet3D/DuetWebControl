<template>
	<v-dialog v-model="shown" persistent width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="doConnect">
				<v-card-title>
					<span class="headline">{{ $t('dialog.connect.title') }}</span>
				</v-card-title>

				<v-card-text>
					{{ $t('dialog.connect.prompt') }}
					<v-text-field :placeholder="$t('dialog.connect.placeholder')" v-model="hostname" :rules="[v => !!v || $t('dialog.connect.hostRequired')]" required></v-text-field>
				</v-card-text>

				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn color="blue darken-1" flat @click="hide">Close</v-btn>
					<v-btn color="blue darken-1" flat type="submit">Connect</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapActions } from 'vuex'

export default {
	data() {
		return {
			valid: false,
			hostname: ""
		}
	},
	props: {
		shown: {
			type: Boolean,
			required: true
		}
	},
	methods: {
		...mapActions(['connect']),
		doConnect() {
			if (this.$refs.form.validate()) {
				this.hide();
				this.connect({ hostname: this.hostname });
			}
		},
		hide() {
			this.$emit("update:shown", false);
		}
	}
}
</script>
