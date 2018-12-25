<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down" :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> New Macro
			</v-btn>
			<v-btn class="hidden-sm-and-down" :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> New Directory
			</v-btn>
			<v-btn class="hidden-sm-and-down" color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> Refresh
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :directory="directory" target="macros" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" sort-table="macros" @fileClicked="fileClicked">
			<template slot="no-data">
				<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">No Macro Files</v-alert>
			</template>

			<template slot="context-menu">
				<v-list-tile v-show="isFile" @click="runFile(selection[0])">
					<v-icon class="mr-1">play_arrow</v-icon> Run Macro
				</v-list-tile>
			</template>
		</base-file-list>

		<v-layout class="hidden-md-and-up mt-2" row wrap justify-space-around>
			<v-btn :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> New Macro
			</v-btn>
			<v-btn :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> New Directory
			</v-btn>
			<v-btn color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> Refresh
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

import { mapState, mapGetters, mapActions } from 'vuex'

import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState(['selectedMachine']),
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
			this.runMacroDialog.question = `Run ${item.name}`;
			this.runMacroDialog.prompt = `Do you want to run ${item.name}?`;
			this.runMacroDialog.filename = item.name;
			this.runMacroDialog.shown = true;
		},
		runFile(filename) {
			this.sendCode(`M98 P"${Path.combine(this.directory, filename)}"`);
		}
	},
	watch: {
		selectedMachine() {
			this.directory = Path.macros;
		}
	}
}
</script>

