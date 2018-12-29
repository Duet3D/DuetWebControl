<style>
.list-icon {
	width: 32px !important;
	height: 32px !important;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">polymer</v-icon> Macros
			<v-spacer></v-spacer>
			<span v-show="isConnected">{{ directory.replace('0:/macros', 'Root') }}</span>
		</v-card-title>

		<v-card-text class="pa-0" v-show="loading || filelist.length">
			<v-progress-linear v-show="loading" :indeterminate="true" class="my-0"></v-progress-linear>

			<v-list class="pt-0" dense>
				<v-list-tile v-if="!isRootDirectory" @click="goUp" v-tab-control>
					<v-list-tile-avatar>
						<v-icon class="list-icon grey lighten-1 white--text">
							keyboard_arrow_up
						</v-icon>
					</v-list-tile-avatar>

					<v-list-tile-content>
						Go up
					</v-list-tile-content>
				</v-list-tile>

				<v-list-tile v-for="item in filelist" :key="item.name" @click="itemClick(item)" v-tab-control>
					<v-list-tile-avatar>
						<v-icon class="list-icon" :class="item.isDirectory ? 'grey lighten-1 white--text' : 'blue white--text'">
							{{ item.isDirectory ? 'folder' : 'assignment' }}
						</v-icon>
					</v-list-tile-avatar>

					<v-list-tile-content>
						<v-list-tile-title>{{ item.displayName }}</v-list-tile-title>
					</v-list-tile-content>

					<v-list-tile-action v-if="!item.isDirectory && item.executing">
						<v-progress-circular indeterminate color="blue"></v-progress-circular>
					</v-list-tile-action>
				</v-list-tile>
			</v-list>
		</v-card-text>

		<v-alert :value="!filelist.length" type="info">
			No Macros
		</v-alert>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

import { getModifiedDirectory } from '../../store/machine'
import { DisconnectedError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapState('machine/model', ['storages']),
		isRootDirectory() { return this.directory === Path.macros; }
	},
	data () {
		return {
			unsubscribe: undefined,
			loading: false,
			wasMounted: false,
			directory: Path.macros,
			filelist: []
		}
	},
	methods: {
		...mapActions('machine', ['sendCode', 'getFileList']),
		async loadDirectory(directory = Path.macros) {
			if (this.loading) {
				return;
			}

			this.loading = true;
			try {
				const files = await this.getFileList(directory);
				files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensivity: 'base' }));
				files.sort((a, b) => (a.isDirectory === b.isDirectory) ? 0 : (a.isDirectory ? -1 : 1));
				files.forEach(function(item) {
					item.displayName = Path.stripMacroFilename(item.name);
					item.executing = false;
				});

				this.directory = directory;
				this.filelist = files;
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					this.$log('error', this.$t('error.filelistRequestFailed'), e.message);
				}
			}
			this.loading = false;
		},
		async itemClick(item) {
			if (this.uiFrozen) {
				return;
			}

			const filename = Path.combine(this.directory, item.name);
			if (item.isDirectory) {
				await this.loadDirectory(filename);
			} else if (!item.executing) {
				item.executing = true;
				try {
					await this.sendCode(`M98 P"${filename}"`);
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						console.warn(e);
					}
				}
				item.executing = false;
			}
		},
		async goUp() {
			await this.loadDirectory(Path.extractFilePath(this.directory));
		}
	},
	mounted() {
		// Perform initial load
		if (this.isConnected) {
			this.wasMounted = this.storages.length && this.storages[0].mounted;
			this.loadDirectory();
		}

		// Keep track of file changes
		const that = this;
		this.unsubscribe = this.$store.subscribeAction(async function(action, state) {
			if (Path.pathAffectsFilelist(getModifiedDirectory(action, state), that.directory, that.filelist)) {
				await that.loadDirectory(that.directory);
			}
		});
	},
	beforeDestroy() {
		this.unsubscribe();
	},
	watch: {
		selectedMachine() {
			if (this.isConnected) {
				this.wasMounted = this.storages.length && this.storages[0].mounted;
				this.loadDirectory();
			} else {
				this.filelist = [];
			}
		},
		storages: {
			deep: true,
			handler() {
				// Refresh file list when the first storage is mounted or unmounted
				if (this.isConnected && (!this.storages.length || this.wasMounted !== this.storages[0].mounted)) {
					this.wasMounted = this.storages.length && this.storages[0].mounted;
					this.loadDirectory();
				}
			}
		}
	}
}
</script>
