<template>
	<div v-auto-size>
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn :loading="loading" :disabled="frozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> Refresh
			</v-btn>
			<upload-btn :directory="directory" target="sys" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" @fileClicked="fileClicked">
			<template slot="no-data">
				<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">No System Files</v-alert>
			</template>
		</base-file-list>
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
			// TODO Add file type detection here
			this.$refs.filelist.edit(item);
		}
	}
}
</script>
