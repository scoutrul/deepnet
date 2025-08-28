<template>
	<div :class="['w-full flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
		<div :class="[
			'max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border',
			message.role === 'user' ? 'bg-slate-900 text-slate-50 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
		]">
			<div v-if="message.typing" class="flex items-center gap-1 text-sm">
				<span class="animate-pulse">●</span>
				<span class="animate-pulse delay-150">●</span>
				<span class="animate-pulse delay-300">●</span>
			</div>
			<div v-else-if="message.error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
				{{ message.error }}
			</div>
			<div v-else>
				<div v-if="message.parsed" class="space-y-2">
					<p class="text-sm whitespace-pre-wrap">
						<template v-if="inlinePieces.length">
							<span v-for="(piece, i) in inlinePieces" :key="i">
								<span v-if="piece.isTerm"
									class="underline decoration-dotted underline-offset-2 cursor-pointer hover:text-slate-700"
									@click.left.prevent="$emit('click-term', { text: piece.text, info: findInfo(piece.text) })"
									@contextmenu.prevent="$emit('queue-term', { text: piece.text, info: findInfo(piece.text) })"
								>
									{{ piece.text }}
								</span>
								<span v-else>{{ piece.text }}</span>
							</span>
						</template>
						<template v-else>{{ message.parsed.text }}</template>
					</p>
					<div class="flex flex-wrap gap-2">
						<HoverTerm
							v-for="(t, i) in message.parsed.terms"
							:key="i"
							:term="{ label: t.text, description: t.info }"
							:active="isQueued(t.text)"
							@click-term="$emit('click-term', t)"
							@queue-term="$emit('queue-term', t)"
						/>
					</div>
				</div>
				<p v-else class="whitespace-pre-wrap text-sm">{{ message.content }}</p>
			</div>
		</div>
	</div>
</template>

<script>
import HoverTerm from '@/components/hover/HoverTerm.vue'

export default {
	name: 'Message',
	props: {
		message: { type: Object, required: true },
		queued: { type: Array, default: () => [] },
	},
	components: { HoverTerm },
	computed: {
		inlinePieces() {
			if (!this.message.parsed?.terms?.length) return []
			const terms = this.message.parsed.terms.map(t => t.text).sort((a, b) => b.length - a.length)
			let text = this.message.parsed.text
			const pieces = []
			while (text.length) {
				let matched = false
				for (const term of terms) {
					const idx = text.toLowerCase().indexOf(term.toLowerCase())
					if (idx === 0) {
						pieces.push({ isTerm: true, text: text.slice(0, term.length) })
						text = text.slice(term.length)
						matched = true
						break
					} else if (idx > 0) {
						pieces.push({ isTerm: false, text: text.slice(0, idx) })
						text = text.slice(idx)
						matched = true
						break
					}
				}
				if (!matched) {
					pieces.push({ isTerm: false, text })
					break
				}
			}
			return pieces
		},
	},
	methods: {
		isQueued(label) {
			return this.queued.some(q => (q.text || q.label)?.toLowerCase() === label.toLowerCase())
		},
		findInfo(label) {
			const t = (this.message.parsed?.terms || []).find(x => x.text.toLowerCase() === label.toLowerCase())
			return t?.info || ''
		},
	},
}
</script>
