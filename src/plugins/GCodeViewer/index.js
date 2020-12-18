import { registerRoute } from '../../routes';
import { registerPluginContextMenuItem, ContextMenuType } from '../index.js';
import GCodeViewer from './GCodeViewer.vue';
import ColorPicker from './ColorPicker.vue';
import Vue from 'vue';
import i18n from '../../i18n'

Vue.component('gcodeviewer-color-picker', ColorPicker);

registerRoute(GCodeViewer, {
  Job: {
    GCodeViewer: {
      icon: 'mdi-rotate-3d',
      caption: i18n.t('plugins.gcodeViewer.caption'),
      path: '/GCodeViewer',
    },
  },
});

registerPluginContextMenuItem(i18n.t('plugins.gcodeViewer.view3D'), '/GCodeViewer', 'mdi-rotate-3d', 'view-3d-model', ContextMenuType.JobFileList);
