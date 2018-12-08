'use strict'

export default{
	namespaced: true,
	state: {
		ajaxRetries: 2,
		updateInterval: 250,
		extendedUpdateEvery: 20,
		fileTransferRetryThreshold: 358400		// 350 KiB
	},
	mutations: {
		update: (state, newSettings) => Object.keys(newSettings).forEach(key => state[key] = newSettings[key])
	}
}
