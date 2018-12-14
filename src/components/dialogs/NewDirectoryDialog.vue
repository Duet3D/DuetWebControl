<template>
	<input-dialog :shown.sync="innerShown" :title="innerTitle" :prompt="innerPrompt" @confirmed="createDirectory"></input-dialog>
</template>

<script>
'use strict'

import { mapGetters, mapActions } from 'vuex'

import Path from '../../utils/path.js'
import { DisconnectedError } from '../../utils/errors.js'

export default {
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		directory: {
			type: String,
			required: true
		},
		title: String,
		prompt: String,
		showSuccess: {
			type: Boolean,
			default: true
		},
		showError: {
			type: Boolean,
			default: true
		}
	},
	computed: mapGetters(['isConnected']),
	data() {
		return {
			innerTitle: this.title || 'New Directory',
			innerPrompt: this.prompt || 'Please enter a new directory name:',
			innerShown: this.shown
		}
	},
	methods: {
		...mapActions('machine', ['makeDirectory']),
		async createDirectory(directory) {
			const currentDirectory = this.directory;
			try {
				const path = Path.combine(currentDirectory, directory);
				await this.makeDirectory(path);

				this.$emit('directoryCreated', path);
				if (this.showSuccess) {
					this.$makeNotification('success', 'Directory created', `Successfully created directory ${directory}`);
				}
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					this.$emit('directoryCreationFailed', e);
					if (this.showError) {
						this.$makeNotification('error', 'Failed to create directory', e.message);
					}
				}
			}
		}
	},
	watch: {
		isConnected(to) {
			if (!to) {
				this.innerShown = false;
			}
		},
		innerShown(to) {
			if (this.shown !== to) {
				this.$emit('update:shown', to);
			}
		},
		shown(to) {
			if (this.innerShown !== to) {
				this.innerShown = to;
			}
		},
		title(to) {
			if (this.innerTitle !== to) {
				this.innerTitle = to;
			}
		},
		prompt(to) {
			if (this.innerPrompt !== to) {
				this.innerPrompt = to;
			}
		}
	}
}
</script>
