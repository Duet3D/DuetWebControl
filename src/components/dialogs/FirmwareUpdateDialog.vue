<template>
	<v-dialog v-model="internalShown" @keydown.escape="dismissed" persistent width="720">
		<v-card>
			<v-card-title>
				<span class="headline">
					{{ $t('dialog.update.title') }}
				</span>
			</v-card-title>

			<v-card-text>
				{{ $t('dialog.update.prompt') }}

				<v-alert :value="!!dsfVersion && isDuetFirmware" type="warning" class="mt-3">
					{{ $t('dialog.update.sbcWarning') }}
				</v-alert>
			</v-card-text>

			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn color="blue darken-1" text @click="dismissed">{{ $t('generic.no') }}</v-btn>
				<v-btn color="blue darken-1" text @click="confirmed">{{ $t('generic.yes') }}</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	props: {
		shown: {
			type: Boolean,
			required: true
		}
	},
	computed: {
		...mapState('machine/model', {
			isDuetFirmware: state => (state.boards.length > 0 && state.boards[0].firmwareFileName) ? state.boards[0].firmwareFileName.startsWith('Duet') : true,
			dsfVersion: state => state.state.dsfVersion
		}),
		internalShown: {
			get() { return this.shown; },
			set(value) {
				if (value) {
					this.confirmed();
				} else {
					this.dismissed();
				}
			}
		}
	},
	methods: {
		confirmed() {
			this.$emit('confirmed');
			this.$emit('update:shown', false);
		},
		dismissed() {
			this.$emit('dismissed');
			this.$emit('update:shown', false);
		}
	}
}
</script>
