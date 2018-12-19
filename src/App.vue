<style>
#title:not(:hover) {
	color: inherit;
}
#title {
	margin-right: 20px;
}

.container {
	padding: 4px;
}
.container div.component,
.container div.v-card {
	margin: 8px;
}

.empty-table-fix td {
	padding-left: 0px !important;
	padding-right: 0px !important;
}

input[type='number'] {
    -moz-appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
}

a:not(:hover) {
	text-decoration: none;
}
</style>

<template>
	<v-app :dark="darkTheme">
		<v-navigation-drawer persistent clipped v-model="drawer" enable-resize-watcher fixed app>
			<div class="pa-2 hidden-sm-and-up">
				<connect-btn block></connect-btn>
				<emergency-btn class="mt-3" block></emergency-btn>
			</div>

			<v-list class="pt-0" expand>
				<v-list-group v-for="(category, index) in routing" :key="index" :prepend-icon="category.icon" no-action :value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t(category.caption) }}</v-list-tile-title>
					</v-list-tile>

					<template v-for="(page, pageIndex) in category.pages">
						<v-list-tile v-if="checkMenuCondition(page.condition)" :key="`${index}-${pageIndex}`" v-ripple :to="page.path" @click="">
							<v-list-tile-action>
								<v-icon>{{ page.icon }}</v-icon>
							</v-list-tile-action>
							<v-list-tile-title>{{ $t(page.caption) }}</v-list-tile-title>
						</v-list-tile>
					</template>
				</v-list-group>
			</v-list>
		</v-navigation-drawer>

		<v-toolbar app clipped-left>
			<v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
			<v-toolbar-title>
				<!-- TODO: Optional OEM branding -->
				<a id="title">{{ name }}</a>
			</v-toolbar-title>
			<connect-btn class="hidden-xs-only"></connect-btn>

			<v-spacer></v-spacer>

			<code-input class="hidden-sm-and-down"></code-input>

			<v-spacer></v-spacer>

			<upload-btn target="start" class="hidden-sm-and-down"></upload-btn>
			<emergency-btn class="hidden-xs-only"></emergency-btn>

			<v-btn icon class="hidden-sm-and-up" @click="hideGlobalContainer = !hideGlobalContainer">
				<v-icon>aspect_ratio</v-icon>
			</v-btn>
			<!-- TODO: Add quick actions and UI designer here -->
			<!--<v-btn icon class="hidden-sm-and-down" @click="rightDrawer = !rightDrawer">
				<v-icon>menu</v-icon>
			</v-btn>-->
		</v-toolbar>

		<v-content id="content">
			<v-scroll-y-transition>
				<v-container fluid class="container" v-show="!hideGlobalContainer || $vuetify.breakpoint.smAndUp">
					<v-layout row wrap>
						<v-flex xs12 sm6 md4 lg4>
							<status-panel></status-panel>
						</v-flex>

						<v-flex xs12 sm6 md5 lg4>
							<tools-panel></tools-panel>
						</v-flex>

						<v-flex v-if="$vuetify.breakpoint.mdAndUp" d-flex md3 lg4>
							<temperature-chart></temperature-chart>
						</v-flex>
					</v-layout>
				</v-container>
			</v-scroll-y-transition>

			<v-divider v-show="!hideGlobalContainer || $vuetify.breakpoint.smAndUp"></v-divider>

			<v-container fluid class="container">
				<router-view></router-view>
			</v-container>
		</v-content>

		<v-navigation-drawer temporary right v-model="rightDrawer" fixed app>
			<!-- TODO Add quick access / component list here in design mode -->
		</v-navigation-drawer>

		<v-footer app>
			<span class="ml-3">&copy; 2018 Christian Hammacher for Duet3D</span>
		</v-footer>

		<connect-dialog></connect-dialog>
		<connection-dialog></connection-dialog>
		<messagebox-dialog></messagebox-dialog>
	</v-app>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

import { Routing } from './routes'

export default {
	computed: {
		...mapState({
			isLocal: state => state.isLocal,
			globalShowConnectDialog: state => state.showConnectDialog,
			name: state => state.machine.model.network.name,
			darkTheme: state => state.settings.darkTheme,
			webcam: state => state.settings.webcam
		}),
		...mapGetters('machine/model', ['isPrinting'])
	},
	data() {
		return {
			drawer: this.$vuetify.breakpoint.lgAndUp,
			hideGlobalContainer: false,
			rightDrawer: false,
			routing: Routing
		}
	},
	methods: {
		...mapActions(['connect', 'disconnectAll']),
		...mapActions('settings', ['load']),
		checkMenuCondition(condition) {
			if (condition === 'webcam') {
				return (this.webcam.url !== '');
			}
			return true;
		}
	},
	mounted() {
		// Attempt to disconnect from every machine when the page is being unloaded
		window.addEventListener('onunload', this.disconnectAll);

		// Connect if running on a board
		if (!this.isLocal) {
			this.connect();
		}

		// Attempt to load the settings
		this.load();
	},
	watch: {
		isPrinting(to) {
			if (to) {
				// Go to Job Status when a print starts
				this.$router.push('/Job/Status');
			}
		}
	}
}
</script>
