<style>
.list-icon {
	width: 32px !important;
	height: 32px !important;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">mdi-polymer</v-icon> {{ $t('list.macro.caption') }}
			<v-spacer></v-spacer>
			<span v-show="isConnected" class="subtitle-2">{{ directory.replace('0:/macros', $t('list.macro.root')) }}</span>
		</v-card-title>

		<v-card-text class="pa-0" v-show="loading || filelist.length || !isRootDirectory">
			<v-progress-linear v-show="loading" :indeterminate="true" class="my-0"></v-progress-linear>

			<v-list class="pt-0" dense>
				<v-list-item v-if="!isRootDirectory" @click="goUp">
					<v-list-item-icon>
						<v-icon class="list-icon mr-1">mdi-arrow-up</v-icon>
					</v-list-item-icon>

					<v-list-item-content>
						<v-list-item-title>{{ $t('list.baseFileList.goUp') }}</v-list-item-title>
					</v-list-item-content>
				</v-list-item>

				<v-list-item v-for="item in filelist" :key="item.name" @click="itemClick(item)">
					<v-list-item-icon>
						<v-icon class="list-icon mr-1">
							{{ item.isDirectory ? 'mdi-folder' : 'mdi-file' }}
						</v-icon>
					</v-list-item-icon>

					<v-list-item-content>
						<v-list-item-title>{{ item.displayName }}</v-list-item-title>
					</v-list-item-content>

					<v-list-item-action v-if="!item.isDirectory && item.executing">
						<v-progress-circular class="list-icon" indeterminate color="blue"></v-progress-circular>
					</v-list-item-action>
				</v-list-item>
			</v-list>
		</v-card-text>

		<v-alert :value="!filelist.length" type="info">
			{{ $t('list.macro.noMacros') }}
		</v-alert>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

import { getModifiedDirectories } from '../../store/machine'
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
			if (Path.pathAffectsFilelist(getModifiedDirectories(action, state), that.directory, that.filelist)) {
				await that.loadDirectory(that.directory);
			}
		});
	},
	beforeDestroy() {
		this.unsubscribe();
	},
	watch: {
		isConnected(to) {
			if (to) {
				this.wasMounted = this.storages.length && this.storages[0].mounted;
				this.loadDirectory();
			} else {
				this.directory = Path.macros;
				this.filelist = [];
			}
		},
		selectedMachine() {
			// TODO store current directory per selected machine
			if (this.isConnected) {
				this.wasMounted = this.storages.length && this.storages[0].mounted;
				this.loadDirectory();
			} else {
				this.directory = Path.macros;
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
