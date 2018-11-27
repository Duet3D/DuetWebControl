<template>
	<v-btn color="error" :disabled="frozen" :title="$t('button.emergencyStop.title')" @click="sendCode('M112\nM999')">
		<i class="fas fa-bolt mr-2"></i> {{ $t('button.emergencyStop.caption') }}
	</v-btn>
</template>

<script>
'use strict'

import { mapActions, mapGetters } from 'vuex'

export default {
	computed: mapGetters({ frozen: 'ui/frozen' }),
	methods: mapActions(['sendCode'])
}
</script>
