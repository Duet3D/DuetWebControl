<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<!--<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">mdi-folder-plus</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>-->
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :directory="directory" target="menu" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" sort-table="menu" @fileClicked="fileClicked" no-files-text="list.menu.noFiles">
			<!-- Files go here -->
		</base-file-list>

		<v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition" class="hidden-md-and-up">
			<template #activator>
				<v-btn v-model="fab" dark color="primary" fab>
					<v-icon v-if="fab">mdi-close</v-icon>
					<v-icon v-else>mdi-dots-vertical</v-icon>
				</v-btn>
			</template>

			<v-btn fab :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon>
			</v-btn>

			<!--<v-btn fab :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon>mdi-folder-plus</v-icon>
			</v-btn>-->

			<v-btn fab color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>

			<upload-btn fab dark :directory="directory" target="menu" color="primary">
				<v-icon>mdi-cloud-upload</v-icon>
			</upload-btn>
		</v-speed-dial>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<new-file-dialog :shown.sync="showNewFile" :directory="directory"></new-file-dialog>
	</div>
</template>

<script>
'use strict'

import Path from '../../utils/path.js'

import { mapGetters, mapState } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', {
			menuDirectory: state => state.directories.menu
		})
	},
	data() {
		return {
			directory: Path.menu,
			loading: false,
			selection: [],
			showNewDirectory: false,
			showNewFile: false,
			fab: false
		}
	},
	methods: {
		refresh() {
			this.$refs.filelist.refresh();
		},
		fileClicked(item) {
			this.$refs.filelist.edit(item);
		}
	},
	mounted() {
		this.directory = this.menuDirectory;
	},
	watch: {
		menuDirectory(to, from) {
			if (Path.equals(this.directory, from) || !Path.startsWith(this.directory, to)) {
				this.directory = to;
			}
		}
	}
}
</script>
