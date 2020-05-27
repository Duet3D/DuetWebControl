'use strict'

import Vue from 'vue'

// Load Height Map plugin manually
window.loadHeightMap = () => {
	import(
		/* webpackChunkName: "HeightMap" */
		'./HeightMap/HeightMap.vue'
	).then(module => Vue.use(module.default));
}
