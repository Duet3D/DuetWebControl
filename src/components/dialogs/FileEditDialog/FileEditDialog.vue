<style>
.cm-editor {
	width: 100%;
}
</style>

<template>
	<v-dialog :value="shown" @input="$emit('update:shown', $event)" fullscreen hide-overlay persistent no-click-animation transition="dialog-bottom-transition">
		<v-card class="d-flex flex-column">
			<v-toolbar flat dark color="primary" class="flex-grow-0 flex-shrink-1">
				<v-btn icon dark @click="close(false)">
					<v-icon>mdi-close</v-icon>
				</v-btn>
				<v-toolbar-title>{{ filename }}</v-toolbar-title>

				<v-spacer></v-spacer>

				<v-btn v-if="isGCode" dark text href="https://duet3d.dozuki.com/Wiki/Gcode" target="_blank">
					<v-icon class="mr-1">mdi-help</v-icon> {{ $t('dialog.fileEdit.gcodeReference') }}
				</v-btn>
				<v-btn v-if="isMenu" dark text href="https://duet3d.dozuki.com/Wiki/Duet_2_Maestro_12864_display_menu_system" target="_blank">
					<v-icon class="mr-1">mdi-help</v-icon> {{ $t('dialog.fileEdit.menuReference') }}
				</v-btn>
				<v-btn dark text @click="save">
					<v-icon class="mr-1">mdi-floppy</v-icon> {{ $t('dialog.fileEdit.save') }}
				</v-btn>
			</v-toolbar>

			<div ref="editor" class="d-flex flex-grow-1"></div>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { defaultKeymap, indentMore } from '@codemirror/commands'
import { history, historyKeymap } from '@codemirror/history'
import { defaultHighlightStyle } from '@codemirror/highlight'
import { highlightActiveLineGutter, lineNumbers } from '@codemirror/gutter'
import { indentOnInput } from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, drawSelection, keymap, highlightActiveLine, highlightSpecialChars } from '@codemirror/view'

import { mapState, mapActions } from 'vuex'

import Path from '../../../utils/path.js'
import gcodeMode from './gcode-mode.js'

const insertTabSpaces = ({ state, dispatch }) => {
    if (state.selection.ranges.some(r => !r.empty))
        return indentMore({ state, dispatch });
    dispatch(state.update(state.replaceSelection("  "), { scrollIntoView: true, userEvent: "input" }));
    return true;
};

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
			gCodesDirectory: state => state.directories.gCodes,
			macrosDirectory: state => state.directories.macros,
			menuDirectory: state => state.directories.menu
		}),
		...mapState('settings', ['darkTheme']),
		isGCode() {
			if (Path.startsWith(this.filename, this.macrosDirectory)) {
				return true;
			}
			const matches = /\.(.*)$/.exec(this.filename.toLowerCase());
			return matches && ['.g', '.gcode', '.gc', '.gco', '.nc', '.ngc', '.tap'].indexOf(matches[1]);
		},
		isMenu() {
			return Path.startsWith(this.filename, this.menuDirectory);
		}
	},
	data() {
		return {
			valueChanged: false,
			view: null
		}
	},
	methods: {
		...mapActions('machine', ['upload']),
		createState(textContent) {
			if (this.view) {
				this.view.destroy();
				this.view = null;
			}

			if (this.darkTheme) {
				this.view = new EditorView({
					state: EditorState.create({
						doc: textContent,
						extensions: [
							defaultHighlightStyle,
							drawSelection(),
							gcodeMode,
							highlightActiveLine(),
							highlightActiveLineGutter(),
							highlightSelectionMatches(),
							highlightSpecialChars(),
							history(),
							indentOnInput(),
							keymap.of([
								...defaultKeymap,
								...historyKeymap,
								...searchKeymap,
								{ key: 'Tab', run: insertTabSpaces },
								{ key: 'Escape', run: () => this.close(false) }
							]),
							lineNumbers(),
							oneDark,
							EditorView.updateListener.of(v => this.valueChanged = v.docChanged)
						],
						tabSize: 2
					}),
					parent: this.$refs.editor
				});
			} else {
				this.view = new EditorView({
					state: EditorState.create({
						doc: textContent,
						extensions: [
							defaultHighlightStyle,
							drawSelection(),
							gcodeMode,
							highlightActiveLine(),
							highlightActiveLineGutter(),
							highlightSelectionMatches(),
							highlightSpecialChars(),
							history(),
							indentOnInput(),
							keymap.of([
								...defaultKeymap,
								...historyKeymap,
								...searchKeymap,
								{ key: 'Tab', run: insertTabSpaces },
								{ key: 'Escape', run: () => this.close(false) }
							]),
							lineNumbers(),
							EditorView.updateListener.of(v => this.valueChanged = v.docChanged)
						],
						tabSize: 2
					}),
					parent: this.$refs.editor
				});
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
			const content = new Blob();
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
		}
	},
	watch: {
		shown(to) {
			if (to) {
				// Scroll to the top again to avoid glitches
				setTimeout(() => {
					this.createState(this.value);

					//this.view.scrollPosIntoView(0);
					this.view.focus();
				}, 250);

				// Add notification for users in case changes have not been saved yet
				window.addEventListener('beforeunload', this.onBeforeLeave);
			} else {
				// ... and turn it off again when the dialog is hidden
				window.removeEventListener('beforeunload', this.onBeforeLeave);

				// Remove focus again to close the OSK
				//if (document.activeElement) {
				//document.activeElement.blur();
				//}
			}
		},
		value(to) {
			// Assign new content
			this.createState(to);
		}
	}
}
</script>
