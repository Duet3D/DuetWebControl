<style>
.edit-textarea {
	align-items: stretch !important;
}
.edit-textarea > div > div {
	align-items: stretch;
	flex-grow: 1;
	padding-left: 0 !important;
}
.edit-textarea > div > div > div {
	align-items: stretch !important;
}
.edit-textarea textarea {
	display: flex;
	flex-grow: 1;
	font-family: monospace;
	padding-left: 12px !important;
	margin-top: 0 !important;
	resize: none;
	-moz-tab-size: 4;
	-o-tab-size: 4;
	tab-size: 4;
}
</style>

<template>
	<v-dialog :value="shown" @input="$emit('update:shown', $event)" fullscreen hide-overlay transition="dialog-bottom-transition">
		<v-card class="d-flex flex-column">
			<v-app-bar flat dark color="primary" class="flex-grow-0 flex-shrink-1">
				<v-btn icon dark @click="close(false)">
					<v-icon>mdi-close</v-icon>
				</v-btn>
				<v-toolbar-title>{{ filename }}</v-toolbar-title>

				<v-spacer></v-spacer>

				<v-btn v-if="showGCodeHelp" dark text href="https://duet3d.dozuki.com/Wiki/Gcode" target="_blank">
					<v-icon class="mr-1">mdi-help</v-icon> {{ $t('dialog.fileEdit.gcodeReference') }}
				</v-btn>
				<v-btn v-if="showDisplayHelp" dark text href="https://duet3d.dozuki.com/Wiki/Duet_2_Maestro_12864_display_menu_system" target="_blank">
					<v-icon class="mr-1">mdi-help</v-icon> {{ $t('dialog.fileEdit.menuReference') }}
				</v-btn>
				<v-btn dark text @click="save">
					<v-icon class="mr-1">mdi-floppy</v-icon> {{ $t('dialog.fileEdit.save') }}
				</v-btn>
			</v-app-bar>

			<v-textarea ref="textarea" hide-details solo :rows="null" class="edit-textarea"
						autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
						:value="innerValue" @input.passive="valueChanged = true" @blur="innerValue = $event.target.value"
						@keydown.tab.exact.prevent="onTextareaTab" @keydown.esc.prevent.stop="close(false)"></v-textarea>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState, mapActions } from 'vuex'

import Path from '../../utils/path.js'

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
	computed: {
		...mapState('machine/model', {
			macrosDirectory: state => state.directories.macros,
			menuDirectory: state => state.directories.menu
		}),
		showGCodeHelp() {
			if (Path.startsWith(this.filename, this.macrosDirectory)) {
				return true;
			}
			const matches = /\.(.*)$/.exec(this.filename.toLowerCase());
			return matches && ['.g', '.gcode', '.gc', '.gco', '.nc', '.ngc', '.tap'].indexOf(matches[1]);
		},
		showDisplayHelp() {
			return Path.startsWith(this.filename, this.menuDirectory);
		}
	},
	data() {
		return {
			innerValue: '',
			valueChanged: false
		}
	},
	methods: {
		...mapActions('machine', ['upload']),
		close(fileSaved) {
			if (this.valueChanged && !fileSaved && !confirm(this.$t('dialog.fileEdit.confirmClose'))) {
				return;
			}

			this.$emit('input', '');
			this.$emit('update:shown', false);
			this.$root.$emit('dialog-closing')
		},
		async save() {
			const content = new Blob([this.innerValue]);
			this.close(true);

			try {
				await this.upload({ filename: this.filename, content });
				this.$emit('editComplete', this.filename);
			} catch (e) {
				// TODO Optionally ask user to save file somewhere else
			}
		},
		onBeforeLeave(e) {
			if (this.valueChanged) {
				// Cancel the event. Chrome also requires returnValue to be set
				e.preventDefault();
				e.returnValue = '';
			}
		},
		onTextareaTab(e) {
			const originalSelectionStart = e.target.selectionStart;
			const textStart = e.target.value.slice(0, originalSelectionStart), textEnd = e.target.value.slice(originalSelectionStart);
			this.innerValue = `${textStart}\t${textEnd}`;
			e.target.value = this.innerValue;
			e.target.selectionEnd = e.target.selectionStart = originalSelectionStart + 1;
		}
	},
	watch: {
		shown(to) {
			// Set textarea content
			this.valueChanged = false;
			this.innerValue = this.value || '';

			if (to) {
				// Add notification for users in case changes have not been saved yet
				window.addEventListener('beforeunload', this.onBeforeLeave);
			} else {
				// ... and turn it off again when the dialog is hidden
				window.removeEventListener('beforeunload', this.onBeforeLeave);
			}
		}
	}
}
</script>
