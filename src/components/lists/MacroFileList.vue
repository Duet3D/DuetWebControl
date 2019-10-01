<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down" :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down" :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down" color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :directory="directory" target="macros" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" sort-table="macros" @fileClicked="fileClicked" no-files-text="list.macro.noMacros">
			<template slot="context-menu">
				<v-list-tile v-show="isFile" @click="runFile(selection[0].name)">
					<v-icon class="mr-1">play_arrow</v-icon> {{ $t('list.macro.run') }}
				</v-list-tile>
			</template>
		</base-file-list>

		<v-layout class="hidden-md-and-up mt-2" row wrap justify-space-around>
			<v-btn :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<v-btn :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn :directory="directory" target="macros" color="primary"></upload-btn>
		</v-layout>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<new-file-dialog :shown.sync="showNewFile" :directory="directory"></new-file-dialog>
		<confirm-dialog :shown.sync="runMacroDialog.shown" :question="runMacroDialog.question" :prompt="runMacroDialog.prompt" @confirmed="runFile(runMacroDialog.filename)"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import { mapGetters, mapActions } from 'vuex'

import Path from '../../utils/path.js'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		isFile() {
			return (this.selection.length === 1) && !this.selection[0].isDirectory;
		}
	},
	data() {
		return {
			directory: Path.macros,
			loading: false,
			selection: [],
			runMacroDialog: {
				question: '',
				prompt: '',
				filename: '',
				shown: false
			},
			showNewDirectory: false,
			showNewFile: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		refresh() {
			this.$refs.filelist.refresh();
		},
		fileClicked(item) {
			this.runMacroDialog.question = this.$t('dialog.runMacro.title', [item.name]);
			this.runMacroDialog.prompt = this.$t('dialog.runMacro.prompt', [item.name]);
			this.runMacroDialog.filename = item.name;
			this.runMacroDialog.shown = true;
		},
		runFile(filename) {
			this.sendCode(`M98 P"${Path.combine(this.directory, filename)}"`);
		}
	}
}
</script>

