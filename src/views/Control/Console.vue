<template>
	<base-grid>
		<dynamic-grid-item :md="[0, 0, 24, 3]">
			<code-input solo></code-input>
		</dynamic-grid-item>
		<dynamic-grid-item :md="[0, 3, 24, 6]">
			<event-log></event-log>
		</dynamic-grid-item>
	</base-grid>
</template>

<script>
'use strict'

import BasePage from '../BasePage.vue'

export default {
	extends: BasePage
}
</script>
