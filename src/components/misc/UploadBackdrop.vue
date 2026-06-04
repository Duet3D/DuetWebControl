<style scoped>
.upload-backdrop {
	position: absolute;
	inset: 0;
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
	background-color: rgba(var(--v-theme-surface), 0.85);
	animation: upload-backdrop-fade-in 0.15s ease;
}

.upload-backdrop-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 48px 64px;
	border: 2px dashed rgba(var(--v-theme-primary), 0.7);
	border-radius: 12px;
	color: rgb(var(--v-theme-primary));
}

@keyframes upload-backdrop-fade-in {
	from { opacity: 0; }
	to { opacity: 1; }
}
</style>

<template>
	<div class="upload-backdrop">
		<div class="upload-backdrop-card">
			<v-icon size="64" class="mb-3">mdi-cloud-upload-outline</v-icon>
			<div class="text-headline-small text-center">{{ $t("layout.uploadOverlay.prompt") }}</div>
		</div>
	</div>
</template>
