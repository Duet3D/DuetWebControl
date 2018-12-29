<template>
	<v-dialog v-model="shown" persistent width="480">
		<v-card>
			<v-card-title>
				<span class="headline">{{ question }}</span>
			</v-card-title>

			<v-card-text>
				{{ prompt }}
			</v-card-text>

			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn color="blue darken-1" flat @click="dismissed">{{ $t('generic.no') }}</v-btn>
				<v-btn color="blue darken-1" flat @click="confirmed">{{ $t('generic.yes') }}</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

export default {
	props: {
		question: {
			type: String,
			required: true
		},
		prompt: {
			type: String,
			required: true
		},
		shown: {
			type: Boolean,
			required: true
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
