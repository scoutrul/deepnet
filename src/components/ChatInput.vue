<template>
	<form @submit.prevent="submit" class="flex flex-col gap-2">
		<input
			v-model="text"
			:type="'text'"
			:disabled="loading"
			placeholder="Задайте вопрос..."
			class="w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
			@keydown.enter.prevent="submit"
		/>
		<button type="submit" class="btn w-max" :disabled="loading">
			<span v-if="!loading">Отправить</span>
			<span v-else>...</span>
		</button>
	</form>
</template>

<script>
export default {
	name: 'ChatInput',
	props: { loading: { type: Boolean, default: false } },
	data() {
		return { text: '' }
	},
	methods: {
		submit() {
			const q = this.text.trim()
			if (!q) return
			this.$emit('submit', q)
			this.text = ''
		},
		appendText(term) {
			const part = String(term || '').trim()
			if (!part) return
			if (!this.text) {
				this.text = part
			} else if (this.text.trim().endsWith(',')) {
				this.text = `${this.text} ${part}`
			} else {
				this.text = `${this.text}, ${part}`
			}
		},
	},
}
</script>
