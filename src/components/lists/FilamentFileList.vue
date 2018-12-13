<template>
	<div v-auto-size>
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn :loading="loading" :disabled="frozen" @click="refresh">
				<v-icon class="mr-1">refresh</v-icon> Refresh
			</v-btn>
			<upload-btn target="filaments" color="primary"></upload-btn>
		</v-toolbar>

		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" :headers="headers" @fileClicked="fileClicked">
			<template slot="no-data">
				<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">No Filaments</v-alert>
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
		...mapGetters('ui', ['frozen'])
	},
	data() {
		return {
			directory: Path.filaments,
			selection: [],
			headers: [
				{
					text: 'Filename',
					value: 'name'
				},
				{
					text: 'Last Modified',
					value: 'lastModified',
					unit: 'date'
				}
			],
			loading: false,
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
