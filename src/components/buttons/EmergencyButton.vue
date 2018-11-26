<template>
	<v-btn color="error" :disabled="uiFrozen" @click="sendCode('M112\nM999')">
		<i class="fas fa-bolt mr-2"></i> {{ $t('button.emergencyStop.caption') }}
	</v-btn>
</template>

<script>
'use strict'

import { mapActions, mapGetters } from 'vuex'

export default {
	computed: mapGetters({ uiFrozen: 'ui/frozen' }),
	methods: mapActions(['sendCode'])
}
</script>
