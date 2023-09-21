'use strict'

import { registerRoute } from '../../routes'

import HeightMap from './HeightMap.vue'
import { useCacheStore } from '@/store/cache';

// Register a route via Control -> Height Map
registerRoute(HeightMap, {
	Plugins: {
		HeightMap: {
			icon: 'mdi-grid',
			caption: 'plugins.heightmap.menuCaption',
			path: '/Plugins/HeightMap'
		}
	}
});

// Register properties in the cache
useCacheStore().registerPluginData("HeightMap", "colorScheme", "terrain");
useCacheStore().registerPluginData("HeightMap", "invertZ", false);
useCacheStore().registerPluginData("HeightMap", "deviationColoring", "fixed");
