<style>
.edit-textarea {
	align-items: stretch !important;
}
.edit-textarea > div > div {
	align-items: stretch;
	flex-grow: 1;
}
.edit-textarea > div > div > div {
	align-items: stretch !important;
}
.edit-textarea textarea {
	display: flex;
	flex-grow: 1;
	font-family: monospace;
	margin-top: 0 !important;
	resize: none;
}
</style>

<style scoped>
.card {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100% !important;
}

.content {
	display: flex;
	flex-grow: 1;
}
</style>

<template>
	<v-dialog v-model="shown" fullscreen hide-overlay transition="dialog-bottom-transition">
		<v-card tile class="card">
			<v-toolbar card dark color="primary">
				<v-btn icon dark @click="close">
					<v-icon>close</v-icon>
				</v-btn>
				<v-toolbar-title>{{ filename }}</v-toolbar-title>

				<v-spacer></v-spacer>

				<v-toolbar-items>
					<v-btn dark flat @click="save">
						<v-icon class="mr-1">save</v-icon> Save
					</v-btn>
				</v-toolbar-items>
			</v-toolbar>

			<v-textarea :value="value" @change="$emit('change', $event)" :rows="null" hide-details solo class="edit-textarea" browser-autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></v-textarea>
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
		},
		filename: {
			type: String,
			required: true
		},
		value: String
	},
	methods: {
		...mapActions(['upload']),
		close() {
			this.$emit('change', '');
			this.$emit('update:shown', false);
		},
		async save() {
			const content = new Blob([this.value]);
			this.close();

			try {
				// TODO Move config.g first if necessary
				await this.upload({ filename: this.filename, content });
			} catch (e) {
				// TODO Optionally ask user to save file somewhere else
			}
		},
		onBeforeLeave(e) {
			// Cancel the event
			e.preventDefault();
			// Chrome requires returnValue to be set
			e.returnValue = '';
		}
	},
	watch: {
		shown(to) {
			// Notify users that they may not have saved their changes yet
			if (to) {
				window.addEventListener('beforeunload', this.onBeforeLeave);
			} else {
				window.removeEventListener('beforeunload', this.onBeforeLeave);
			}
		}
	}
}
</script>
