<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down" :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> New File
			</v-btn>
			<v-btn class="hidden-sm-and-down" :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> New Directory
			</v-btn>
			<v-btn class="hidden-sm-and-down" color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> Refresh
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :directory="directory" target="sys" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" sort-table="sys" @fileClicked="fileClicked" @fileEdited="fileEdited">
			<template slot="no-data">
				<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">No System Files</v-alert>
			</template>
		</base-file-list>

		<v-layout class="hidden-md-and-up mt-2" row wrap justify-space-around>
			<v-btn :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">add</v-icon> New File
			</v-btn>
			<v-btn :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">create_new_folder</v-icon> New Directory
			</v-btn>
			<v-btn color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> Refresh
			</v-btn>
			<upload-btn :directory="directory" target="sys" color="primary"></upload-btn>
		</v-layout>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<new-file-dialog :shown.sync="showNewFile" :directory="directory"></new-file-dialog>
		<confirm-dialog :shown.sync="showResetPrompt" question="Reset board?" prompt="Would you like to restart your board to apply the updated configuration?" @confirmed="resetBoard"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapState('machine/model', ['state']),
		...mapGetters(['uiFrozen'])
	},
	data() {
		return {
			directory: Path.sys,
			loading: false,
			selection: [],
			showNewDirectory: false,
			showNewFile: false,
			showResetPrompt: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		refresh() {
			this.$refs.filelist.refresh();
		},
		fileClicked(item) {
			if (item.name.toLowerCase().endsWith('.bin')) {
				this.$refs.filelist.download(item);
			} else {
				this.$refs.filelist.edit(item);
			}
		},
		fileEdited(filename) {
			if (filename === Path.configFile && !this.state.isPrinting) {
				this.showResetPrompt = true;
			}
		},
		async resetBoard() {
			try {
				await this.sendCode('M999');
			} catch (e) {
				// this is expected
			}
		}
	},
	watch: {
		selectedMachine() {
			this.directory = Path.sys;
		}
	}
}
</script>
