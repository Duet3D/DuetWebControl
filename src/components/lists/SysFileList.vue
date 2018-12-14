<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn :disabled="frozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> New File
			</v-btn>
			<v-btn :disabled="frozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> New Directory
			</v-btn>
			<v-btn color="info" :loading="loading" :disabled="frozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> Refresh
			</v-btn>
			<upload-btn :directory="directory" target="sys" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" @fileClicked="fileClicked">
			<template slot="no-data">
				<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">No System Files</v-alert>
			</template>
		</base-file-list>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<new-file-dialog :shown.sync="showNewFile" :directory="directory"></new-file-dialog>
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
			directory: Path.sys,
			loading: false,
			selection: [],
			showNewDirectory: false,
			showNewFile: false
		}
	},
	methods: {
		...mapActions(['sendCode']),
		refresh() {
			this.$refs.filelist.refresh();
		},
		fileClicked(item) {
			// TODO Add file type detection here
			this.$refs.filelist.edit(item);
		}
	}
}
</script>
