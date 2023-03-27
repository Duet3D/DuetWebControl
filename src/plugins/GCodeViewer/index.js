'use strict'

import Vue from 'vue';

import i18n from '@/i18n';
import { registerPluginContextMenuItem, ContextMenuType } from '@/plugins';
import { registerRoute } from '@/routes';
import { registerPluginData, PluginDataType } from '@/store';

import Gauge from './Gauge/gauge.vue';
import ColorPicker from './ColorPicker.vue';
import FSOverlay from './FSOverlay.vue'
import GCodeViewer from './GCodeViewer.vue';
import CodeStream from './CodeStream.vue';

Vue.component('gcodeviewer-gauge', Gauge);
Vue.component('gcodeviewer-color-picker', ColorPicker);
Vue.component('fs-overlay', FSOverlay);
Vue.component('code-stream', CodeStream);

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
registerPluginData('GCodeViewer', PluginDataType.machineCache, 'toolColors', ['#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#FFFFFF']);
registerPluginData('GCodeViewer', PluginDataType.machineCache, 'useHQRendering', false);
registerPluginData('GCodeViewer', PluginDataType.machineCache, 'useSpecular', true);
registerPluginData('GCodeViewer', PluginDataType.machineCache, 'g1AsExtrusion', false);
registerPluginData('GCodeViewer', PluginDataType.machineCache, 'viewGCode', false);
registerPluginData('GCodeViewer', PluginDataType.machineCache, 'zBelt', false);
registerPluginData('GCodeViewer', PluginDataType.machineCache, 'zBeltAngle', 45);