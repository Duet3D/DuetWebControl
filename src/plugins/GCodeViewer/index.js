'use strict'

import i18n from '../../i18n'
import Vue from 'vue';

import { registerRoute } from '../../routes';
import { registerPluginContextMenuItem, ContextMenuType } from '../index.js';
import GCodeViewer from './GCodeViewer.vue';
import ColorPicker from './ColorPicker.vue';

Vue.component('gcodeviewer-color-picker', ColorPicker);

registerRoute(GCodeViewer, {
	Job: {
		GCodeViewer: {
			icon: 'mdi-rotate-3d',
			caption: 'plugins.gcodeViewer.caption',
			path: '/Job/GCodeViewer',
		},
	},
});

registerPluginContextMenuItem(() => i18n.t('plugins.gcodeViewer.view3D'), '/Job/GCodeViewer', 'mdi-rotate-3d', 'view-3d-model', ContextMenuType.JobFileList);
