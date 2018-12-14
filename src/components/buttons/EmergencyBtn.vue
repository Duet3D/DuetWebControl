<template>
	<code-btn v-bind="$props" :code="'M112\nM999'" color="$props.color || error" :title="$t('button.emergencyStop.title')">
		<v-icon class="mr-1">flash_on</v-icon> {{ $t('button.emergencyStop.caption') }}
	</code-btn>
</template>

<script>
'use strict'

import VBtn from 'vuetify/es5/components/VBtn'

export default {
	extends: VBtn
}
</script>
