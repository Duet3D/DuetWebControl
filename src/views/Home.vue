<template>
	<div>
		FOOBAR!123
	</div>
</template>

<script lang="ts" setup>
import { useMachineStore } from '@/store/machine';

useMachineStore().model.job.lastDuration = 123;

console.log("FOO");
</script>
