<template>
	<v-dialog v-model="shown" :persistent="persistent" width="480">
		<v-card>
			<v-card-title>
				<span class="headline">{{ messageBox.title }}</span>
			</v-card-title>

			<v-card-text>
				{{ messageBox.message }}
				<!-- Jog control -->
			</v-card-text>

			<v-card-actions v-if="messageBox.mode">
				<v-spacer></v-spacer>
				<v-btn v-if="messageBox.mode === 1 || messageBox.mode === 3" color="blue darken-1" flat @click="cancel">
					{{ $t(messageBox.mode === 1 ? 'generic.close' : 'generic.cancel') }}
				</v-btn>
				<v-btn v-if="messageBox.mode === 2 || messageBox.mode === 3" color="blue darken-1" flat @click="ok">
					{{ $t('generic.ok') }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState, mapActions } from 'vuex'

export default {
	computed: mapState('machine', ['messageBox']),
	data() {
		return {
			shown: false,
			persistent: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		ok() {
			this.shown = false;
			this.sendCode('M292');
		},
		cancel() {
			this.shown = false;
			this.sendCode('M292 P1');
		}
	},
	watch: {
		'messageBox.mode'(to) {
			this.shown = (to !== null);
			this.persistent = (to === 1);
		}
	}

	/*
		mode: null
		title: undefined,
		message: undefined,
		timeout: undefined,
		controls: undefined
	*/
}
</script>
