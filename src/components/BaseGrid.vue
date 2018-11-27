<template>
	<dynamic-grid :editing="designMode" @itemSelected="itemSelected" :size="$vuetify.breakpoint.name">
		<slot></slot>
	</dynamic-grid>
</template>

<script>
'use strict'

import { mapState, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState('ui', ['designMode', 'selectedItem'])
	},
	methods: {
		...mapMutations('ui', ['setSelectedItem']),
		itemSelected(item) { this.setSelectedItem(item); }
	}
}
</script>
