<template>
	<v-menu offset-y>
		<template #activator="{ on }">
			<v-btn v-bind="$props" v-on="on" color="success" :loading="mounting">
				<v-icon class="mr-1">mdi-sd</v-icon> {{ getVolumeName(value) }} <v-icon class="ml-1">mdi-menu-down</v-icon>
			</v-btn>
		</template>

		<v-list ref="list">
			<v-list-item v-for="(volume, index) in volumes" :key="index" @click="selectVolume(index)">
				<v-icon class="mr-1">{{ volume.mounted ? 'mdi-check' : 'mdi-close' }}</v-icon>
				{{ getVolumeName(index) }} ({{ $t(volume.mounted ? 'generic.mounted' : 'generic.notMounted') }})
			</v-list-item>
		</v-list>
	</v-menu>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	props: {
		value: {
			type: Number,
			required: true
		}
	},
	computed: {
		...mapGetters(['isConnected']),
		...mapState('machine/model', ['volumes'])
	},
	data() {
		return {
			mounting: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		getVolumeName(index) {
			if (index >= 0 && index < this.volumes.length && this.volumes[index].name) {
				return this.volumes[index].name;
			}
			return this.$t('generic.sdCard', [index]);
		},
		async selectVolume(index) {
			if (!this.isConnected) {
				return;
			}

			// Check if the volume is already mounted
			const volume = this.volumes[index];
			if (volume.mounted) {
				this.$emit('input', index);
				return;
			}

			// Try to mount it
			let success = true, response;
			this.mounting = true;
			try {
				response = await this.sendCode({ code: `M21 P${index}`, log: false });
				success = response.indexOf('Error') === -1;
			} catch (e) {
				response = e.message;
				success = false;
			}
			this.mounting = false;

			// Deal with the result
			if (success) {
				this.$log('success', this.$t('notification.mount.successTitle'), response);
				this.$emit('input', index);
			} else {
				this.$log('error', this.$t('notification.mount.errorTitle'), response);
			}
		}
	}
}
</script>
