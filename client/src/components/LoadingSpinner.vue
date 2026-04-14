<script setup>
const props = defineProps({
  msg: {
    type: String,
    default: 'Loading...',
  },
})
</script>

<template>
	<div class="loading-spinner">
		<div class="spinner"></div>
		<p v-if="msg !== ''">{{ msg }}</p>
	</div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as var;

.loading-spinner {
	margin: 30vh 0;

	.spinner {
		margin: 2rem auto;
		border: 4px solid var(--border);
		border-top: 4px solid var(--accent);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
	}
	p {
		text-align: center;
	}
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}

	100% {
		transform: rotate(360deg);
	}
}
</style>
