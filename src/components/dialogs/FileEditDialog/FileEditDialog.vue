<style>
.vue-codemirror {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
}
.CodeMirror {
	display: flex;
	flex-grow: 1;
}
.CodeMirror-sizer {
	width: 100%;
}
.CodeMirror-scroll {
	display: flex;
	flex-grow: 1;
	height: unset;
	width: 100%;
}

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
	<v-dialog :value="shown" @input="$emit('update:shown', $event)" fullscreen hide-overlay persistent no-click-animation transition="dialog-bottom-transition">
		<v-card class="d-flex flex-column">
			<v-app-bar flat dark color="primary" class="flex-grow-0 flex-shrink-1">
				<v-btn icon dark @click="close(false)">
					<v-icon>mdi-close</v-icon>
				</v-btn>
				<v-toolbar-title>{{ filename }}</v-toolbar-title>

				<v-spacer></v-spacer>

				<v-btn v-if="isGCode" class="hidden-xs-only" dark text href="https://docs.duet3d.com/en/User_manual/Reference/Gcodes" target="_blank">
					<v-icon class="mr-1">mdi-help</v-icon> {{ $t('dialog.fileEdit.gcodeReference') }}
				</v-btn>
				<v-btn v-if="isMenu" class="hidden-xs-only" dark text href="https://docs.duet3d.com/en/User_manual/Connecting_hardware/Display_12864_menu#menu-files" target="_blank">
					<v-icon class="mr-1">mdi-help</v-icon> {{ $t('dialog.fileEdit.menuReference') }}
				</v-btn>
				<v-btn dark text @click="save">
					<v-icon class="mr-1">mdi-floppy</v-icon> {{ $t('dialog.fileEdit.save') }}
				</v-btn>
			</v-app-bar>

			<codemirror v-if="useEditor"
						ref="cmEditor" :options="cmOptions"
						v-model="innerValue" @changes="valueChanged = true"
						@keydown.esc.prevent.stop="close(false)"></codemirror>
			<v-textarea v-else
						ref="textarea" hide-details solo :rows="null" class="edit-textarea"
						autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
						:value="innerValue" @input.passive="valueChanged = true" @blur="innerValue = $event.target.value"
						@keydown.tab.exact.prevent="onTextareaTab" @keydown.esc.prevent.stop="close(false)"></v-textarea>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { codemirror } from 'vue-codemirror'
import 'codemirror/addon/dialog/dialog.js'
import 'codemirror/addon/dialog/dialog.css'
import 'codemirror/addon/selection/active-line.js'
import 'codemirror/addon/search/search.js'
import 'codemirror/addon/search/searchcursor.js'
import 'codemirror/addon/search/jump-to-line.js'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/blackboard.css'

import { mapState, mapActions } from 'vuex'

import './gcode-mode.js'
import Path from '../../../utils/path.js'

const maxEditorFileSize = 8388608			// 8 MiB

export default {
	components: {
		codemirror
	},
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
			gCodesDirectory: state => state.directories.gCodes,
			macrosDirectory: state => state.directories.macros,
			menuDirectory: state => state.directories.menu
		}),
		...mapState('settings', ['darkTheme']),
		cmOptions() {
			return {
				mode: 'application/x-gcode',
				theme: this.darkTheme ? 'blackboard' : 'default',
				indentWithTabs: true,
				inputStyle: 'textarea',
				lineNumbers: true,
				styleActiveLine: true
			}
		},
		isGCode() {
			if (Path.startsWith(this.filename, this.macrosDirectory)) {
				return true;
			}
			const matches = /\.(.*)$/.exec(this.filename.toLowerCase());
			return matches && ['.g', '.gcode', '.gc', '.gco', '.nc', '.ngc', '.tap'].indexOf(matches[1]);
		},
		isMenu() {
			return Path.startsWith(this.filename, this.menuDirectory);
		},
		isIOS() {
			return [
					'iPad Simulator',
					'iPhone Simulator',
					'iPod Simulator',
					'iPad',
					'iPhone',
					'iPod'
				].includes(navigator.platform)
				// iPad on iOS 13 detection
				|| (navigator.userAgent.includes("Mac") && "ontouchend" in document)
		}
	},
	data() {
		return {
			innerValue: '',
			valueChanged: false,
			useEditor: false
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
			let spacesInserted = 1;
			const textStart = e.target.value.slice(0, originalSelectionStart), textEnd = e.target.value.slice(originalSelectionStart);
			if (textStart.endsWith(' ')) {
				let numSpaces = 0;
				for (let i = textStart.length - 1; i >= 0; i--) {
					if (textStart[i] === ' ') {
						numSpaces++;
					} else {
						break;
					}
				}

				spacesInserted = 4 - numSpaces % 4;
				let spaces = '';
				for (let i = 0; i < spacesInserted; i++) {
					spaces += ' ';
				}
				this.innerValue = textStart + spaces + textEnd;
			} else {
				this.innerValue = textStart + '\t' + textEnd;
			}
			e.target.value = this.innerValue;
			e.target.selectionEnd = e.target.selectionStart = originalSelectionStart + spacesInserted;
		}
	},
	watch: {
		shown(to) {
			// Update textarea
			this.useEditor = (!this.value || this.value.length < maxEditorFileSize) && this.isGCode && !window.disableCodeMirror && !this.isIOS;
			this.innerValue = this.value || '';
			this.$nextTick(() => this.valueChanged = false);

			if (to) {
				// Scroll to the top again to avoid glitches
				setTimeout(() => {
					if (this.$refs.cmEditor) {
						this.$refs.cmEditor.cminstance.scrollTo(0, 0)
						this.$refs.cmEditor.cminstance.focus();
					} else if (this.$refs.textarea) {
						this.$refs.textarea.scrollTo(0, 0);
						this.$refs.textarea.focus();
					}
				}, 250);

				// Add notification for users in case changes have not been saved yet
				window.addEventListener('beforeunload', this.onBeforeLeave);
			} else {
				// ... and turn it off again when the dialog is hidden
				window.removeEventListener('beforeunload', this.onBeforeLeave);

				// Remove focus again to close the OSK
				if (this.$refs.cmEditor) {
					this.$refs.cmEditor.cminstance.getTextArea().blur();
				} else if (this.$refs.textarea) {
					this.$refs.textarea.blur();
				}
			}
		}
	}
}
</script>
