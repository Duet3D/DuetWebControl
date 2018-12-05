'use strict'

export default{
	namespaced: true,
	state: {
		ajaxRetries: 2,
		updateInterval: 250,
		extendedUpdateEvery: 10
	},
	mutations: {
		// TODO: ---v
		update: (state, newSettings) => Object.keys(newSettings).forEach(key => state[key] = newSettings[key])
	}
}
