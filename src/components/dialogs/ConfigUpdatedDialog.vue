<template>
	<v-dialog :value="shown" @input="$emit('shown', $event)" @keydown.escape="$emit('shown', $event)" persistent width="720">
		<v-card>
			<v-card-title>
				<span class="headline">
					{{ $t('dialog.configUpdated.title') }}
				</span>
			</v-card-title>

			<v-card-text>
				{{ $t('dialog.configUpdated.prompt') }}
			</v-card-text>

			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn color="blue darken-1" text @click="cancel">{{ $t('generic.cancel') }}</v-btn>
				<v-btn color="blue darken-1" text @click="reset">{{ $t('dialog.configUpdated.reset') }}</v-btn>
				<v-btn color="blue darken-1" text @click="runConfig">{{ $t('dialog.configUpdated.runConfig') }}</v-btn>
			</v-card-actions>
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
	methods: {
		...mapActions('machine', ['sendCode']),
		cancel() {
			this.$emit('update:shown', false);
		},
		async reset() {
			this.$emit('update:shown', false);
			await this.sendCode('M999');
		},
		async runConfig() {
			this.$emit('update:shown', false);
			await this.sendCode('M98 P"config.g"');
		}
	}
}
</script>
