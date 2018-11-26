<style>
#title:not(:hover) {
	color: inherit;
}
#title {
	margin-right: 20px;
}
</style>

<template>
	<v-app>
		<v-navigation-drawer persistent clipped v-model="drawer" enable-resize-watcher fixed app>
			<v-list class="pt-0" expand>
				<!-- This static content is only temporary and will be replaced by v-for directives as soon as the UI designer is ready -->
				<v-list-group prepend-icon="fas fa-cog" no-action value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t('menu.control.caption') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-tachometer-alt</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.control.dashboard') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Console" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-terminal</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.control.console') }}</v-list-tile-title>
					</v-list-tile>
				</v-list-group>

				<v-list-group prepend-icon="fas fa-print" no-action value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t('menu.job.caption') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Job/Status" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-info-circle</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.job.status') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Job/Visualiser" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-object-group</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.job.visualiser') }}</v-list-tile-title>
					</v-list-tile>
				</v-list-group>
				
				<v-list-group prepend-icon="fas fa-hdd" no-action value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t('menu.files.caption') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Files/Jobs" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-print</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.jobs') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Files/Macros" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-link</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.macros') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Files/System" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-cogs</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.system') }}</v-list-tile-title>
					</v-list-tile>
					
					<v-list-tile v-ripple to="/Files/Web" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-cloud</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.web') }}</v-list-tile-title>
					</v-list-tile>
				</v-list-group>

				<v-list-group prepend-icon="fas fa-sliders-h" no-action value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t('menu.settings.caption') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Settings/Interface" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-globe</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.settings.interface') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Settings/Machine" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-wrench</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.settings.machine') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Settings/Update" @click="">
						<v-list-tile-action>
							<v-icon>fas fa-sync</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.settings.update') }}</v-list-tile-title>
					</v-list-tile>
				</v-list-group>
			</v-list>
		</v-navigation-drawer>

		<v-toolbar app clipped-left>
			<v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
			<v-toolbar-title>
				<!-- TODO: Optional OEM branding -->
				<a id="title">{{ machine.name }}</a>
			</v-toolbar-title>
			<connect-btn v-if="isLocal"></connect-btn>

			<v-spacer></v-spacer>

			<gcode-input class="hidden-sm-and-down"></gcode-input>

			<v-spacer></v-spacer>

			<upload-btn target="uploadPrint" class="hidden-sm-and-down"></upload-btn>
			<emergency-btn></emergency-btn>

			<!-- TODO: Add quick actions and UI designer here -->
		   <!--<v-btn icon @click.stop="rightDrawer = !rightDrawer">
				<v-icon>fas fa-bars</v-icon>
			</v-btn>-->
		</v-toolbar>

		<v-content>
			<dynamic-grid :editing="ui.designMode" :selectedItem="selectedItem" :size="$vuetify.breakpoint.name" ref="globalGrid">
				<dynamic-grid-item :xs="[0, 0, 24, 8]" :sm="[0, 0, 12, 8]" :md="[0, 0, 8, 8]" :lg="[0, 0, 6, 8]" :min-h="8" :max-h="8">
					<status-panel></status-panel>
				</dynamic-grid-item>
			</dynamic-grid>

			<router-view></router-view>
		</v-content>

		<v-navigation-drawer temporary right v-model="rightDrawer" fixed app>
			<!-- In design mode: Add component list here -->
		</v-navigation-drawer>

		<v-footer app>
			<span class="ml-3">&copy; 2018 Christian Hammacher for Duet3D</span>
		</v-footer>
	</v-app>
</template>

<script>
'use strict';

import { mapGetters, mapState, mapMutations } from 'vuex'

export default {
	computed: {
		...mapGetters(['isLocal', 'machine']),
		...mapState(['ui']),
		designMode: {
			get() { return this.ui.designMode; },
			set(value) { this.setDesignMode(value); }
		},
		selectedItem: {
			get() { return this.ui.selectedItem; },
			set(value) { this.setSelectedItem(value); }
		}
	},
	data() {
		return {
			drawer: this.$vuetify.breakpoint.lgAndUp,
			rightDrawer: false
		}
	},
	methods: {
		...mapMutations('ui', ['setDesignMode'])
	}
}
</script>
