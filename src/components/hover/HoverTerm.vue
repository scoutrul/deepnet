<template>
	<span class="relative inline-flex">
		<button
			ref="btn"
			type="button"
			class="badge"
			@mouseenter="onEnter"
			@mouseleave="onLeave"
			@click.left.prevent="emitClick"
			@contextmenu.prevent="emitQueue"
		>
			{{ term.label }}
		</button>
		<div v-if="open" class="absolute z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg ring-1 ring-slate-200/50">
			<div class="mb-1 text-sm font-semibold">{{ term.label }}</div>
			<p class="text-xs text-slate-700">{{ term.description }}</p>
		</div>
	</span>
</template>

<script>
export default {
	name: 'HoverTerm',
	props: { term: { type: Object, required: true } },
	data() {
		return { open: false, enterTimer: null, leaveTimer: null }
	},
	methods: {
		onEnter() {
			clearTimeout(this.leaveTimer)
			this.enterTimer = setTimeout(() => (this.open = true), 200)
		},
		onLeave() {
			clearTimeout(this.enterTimer)
			this.leaveTimer = setTimeout(() => (this.open = false), 250)
		},
		emitClick() {
			this.$emit('click-term', { label: this.term.label, description: this.term.description })
		},
		emitQueue() {
			this.$emit('queue-term', { label: this.term.label, description: this.term.description })
		},
	},
	beforeDestroy() {
		clearTimeout(this.enterTimer)
		clearTimeout(this.leaveTimer)
	},
}
</script>
