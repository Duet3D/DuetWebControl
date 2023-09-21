'use strict'

import Vue from 'vue';

import i18n from '@/i18n';
import { registerRoute } from '@/routes';
import { useUiStore, ContextMenuType } from '@/store/ui';

import Gauge from './Gauge/gauge.vue';
import ColorPicker from './ColorPicker.vue';
import FSOverlay from './FSOverlay.vue'
import GCodeViewer from './GCodeViewer.vue';
import CodeStream from './CodeStream.vue';
import { useCacheStore } from '@/store/cache';

Vue.component('gcodeviewer-gauge', Gauge);
Vue.component('gcodeviewer-color-picker', ColorPicker);
Vue.component('fs-overlay', FSOverlay);
Vue.component('code-stream', CodeStream);

registerRoute(GCodeViewer, {
	Job: {
		GCodeViewer: {
			icon: 'mdi-rotate-3d',
			caption: 'plugins.gcodeViewer.caption',
			path: '/Plugins/GCodeViewer',
		},
	},
});

useCacheStore().registerPluginData('GCodeViewer', 'toolColors', ['#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#FFFFFF']);
useCacheStore().registerPluginData('GCodeViewer', 'useHQRendering', false);
useCacheStore().registerPluginData('GCodeViewer', 'useSpecular', true);
useCacheStore().registerPluginData('GCodeViewer', 'g1AsExtrusion', false);
useCacheStore().registerPluginData('GCodeViewer', 'viewGCode', false);
useCacheStore().registerPluginData('GCodeViewer', 'zBelt', false);
useCacheStore().registerPluginData('GCodeViewer', 'zBeltAngle', 45);
useCacheStore().registerPluginData('GCodeViewer', 'showWorkplace', true);
useUiStore().registerContextMenuItem(() => i18n.t('plugins.gcodeViewer.view3D'), '/Plugins/GCodeViewer', 'mdi-rotate-3d', 'view-3d-model', ContextMenuType.JobFileList);
