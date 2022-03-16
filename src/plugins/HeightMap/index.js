'use strict'

import { registerRoute } from '../../routes'
import { registerPluginData, PluginDataType } from '../../store'

import HeightMap from './HeightMap.vue'

// Register a route via Control -> Height Map
registerRoute(HeightMap, {
	Control: {
		HeightMap: {
			icon: 'mdi-grid',
			caption: 'plugins.heightmap.menuCaption',
			path: '/HeightMap'
		}
	}
});

// Register a new cached property
registerPluginData('HeightMap', PluginDataType.machineCache, 'colorScheme', 'terrain');
registerPluginData('HeightMap', PluginDataType.machineCache, 'invertZ', false);
registerPluginData('HeightMap', PluginDataType.machineCache, 'deviationColoring', 'fixed');
