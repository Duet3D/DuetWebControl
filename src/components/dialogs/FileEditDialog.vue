<style>
.edit-textarea {
	align-items: stretch !important;
}
.edit-textarea > div > div {
	align-items: stretch;
	flex-grow: 1;
	padding: 0 !important;
}
.edit-textarea > div > div > div {
	align-items: stretch !important;
}
.edit-textarea textarea {
	display: flex;
	flex-grow: 1;
	font-family: monospace;
	padding-left: 12px;
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
				<v-btn icon dark @click="close(false)">
					<v-icon>close</v-icon>
				</v-btn>
				<v-toolbar-title>{{ filename }}</v-toolbar-title>

				<v-spacer></v-spacer>

				<v-toolbar-items>
					<v-btn v-if="showGCodeHelp" dark flat href="https://duet3d.dozuki.com/Wiki/Gcode" target="_blank">
						<v-icon class="mr-1">help</v-icon> {{ $t('dialog.fileEdit.gcodeReference') }}
					</v-btn>
					<v-btn v-if="showDisplayHelp" dark flat href="https://duet3d.dozuki.com/Wiki/Duet_2_Maestro_12864_display_menu_system" target="_blank">
						<v-icon class="mr-1">help</v-icon> {{ $t('dialog.fileEdit.menuReference') }} 
					</v-btn>
					<v-btn dark flat @click="save">
						<v-icon class="mr-1">save</v-icon> {{ $t('dialog.fileEdit.save') }}
					</v-btn>
				</v-toolbar-items>
			</v-toolbar>

			<v-textarea ref="textarea" :value="innerValue" @blur="setInnerValue($event.target.value)" @keydown.tab.exact.prevent="onTextareaTab" @keydown.esc="close(false)" :rows="null" hide-details solo class="edit-textarea" browser-autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></v-textarea>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapActions } from 'vuex'

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
		showGCodeHelp() {
			if (this.filename.startsWith(Path.macros)) {
				return true;
			}
			const matches = /\.(.*)$/.exec(this.filename.toLowerCase());
			return matches && ['.g', '.gcode', '.gc', '.gco', '.nc', '.ngc', '.tap'].indexOf(matches[1]);
		},
		showDisplayHelp() {
			return this.filename.startsWith(Path.display);
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
		setInnerValue(value) {
			if (value != this.innerValue) {
				this.valueChanged = true;
				this.innerValue = value;
			}
		},
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
			const textStart = e.target.value.slice(0, originalSelectionStart);
			const textEnd = e.target.value.slice(originalSelectionStart);
			e.target.value = `${textStart}\t${textEnd}`;
			e.target.selectionEnd = e.target.selectionStart = originalSelectionStart + 1;
		}
	},
	watch: {
		shown(to) {
			// Set textarea content
			this.valueChanged = false;
			this.innerValue = this.value;

			if (to) {
				// Notify users that they may not have saved their changes yet
				window.addEventListener('beforeunload', this.onBeforeLeave);

				// Auto-focus textarea
				const textarea = this.$refs.textarea;
				setTimeout(function() { textarea.focus(); }, 100);
			} else {
				window.removeEventListener('beforeunload', this.onBeforeLeave);
			}
		}
	}
}
</script>
