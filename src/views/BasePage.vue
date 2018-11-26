<template>
	<dynamic-grid :editing="ui.designMode" :selectedItem="selectedItem" ref="grid">
		<slot></slot>
	</dynamic-grid>
</template>

<script>
'use strict'

import { mapState, mapMutations } from 'vuex'

// This is the base component that is extended by every page
export default {
	computed: {
		...mapState(['ui']),
		selectedItem: {
			get() { return this.ui.selectedItem; },
			set(value) { this.setSelectedItem(value); }
		}
	},
	methods: mapMutations('ui', ['setSelectedItem'])
	// TODO here goes dynamic saving+loading of layouts and an interface to App for interacting with the designer
}
</script>
