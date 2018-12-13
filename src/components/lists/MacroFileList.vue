<template>
	<div v-auto-size>
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn :loading="loading" :disabled="frozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> Refresh
			</v-btn>
			<upload-btn :directory="directory" target="macros" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" @fileClicked="fileClicked">
			<template slot="no-data">
				<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">No Macro Files</v-alert>
			</template>

			<template slot="context-menu">
				<v-list-tile v-show="isFile" @click="runFile(selection[0])">
					<v-icon class="mr-1">play_arrow</v-icon> Run Macro
				</v-list-tile>
			</template>
		</base-file-list>

		<confirm-dialog :shown.sync="confirmDialog.shown" :question="confirmDialog.question" :prompt="confirmDialog.prompt" @confirmed="runFile(confirmDialog.filename)"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import { mapGetters, mapActions } from 'vuex'

import Path from '../../utils/path.js'

export default {
	computed: {
		...mapGetters('ui', ['frozen']),
		isFile() {
			return (this.selection.length === 1) && !this.selection[0].isDirectory;
		}
	},
	data() {
		return {
			directory: Path.macros,
			loading: false,
			selection: [],
			confirmDialog: {
				question: '',
				prompt: '',
				filename: '',
				shown: false
			}
		}
	},
	methods: {
		...mapActions(['sendCode']),
		refresh() {
			this.$refs.filelist.refresh();
		},
		fileClicked(item) {
			this.confirmDialog.question = `Run ${item.name}`;
			this.confirmDialog.prompt = `Do you want to run ${item.name}?`;
			this.confirmDialog.filename = item.name;
			this.confirmDialog.shown = true;
		},
		runFile(filename) {
			this.sendCode(`M98 P"${Path.combine(this.directory, filename)}"`);
		}
	}
}
</script>

