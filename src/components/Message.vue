<template>
	<div :class="['w-full flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
		<div :class="[
			'max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border',
			message.role === 'user' ? 'bg-slate-900 text-slate-50 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
		]">
			<div v-if="message.error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
				{{ message.error }}
			</div>
			<div v-else>
				<div v-if="message.parsed" class="space-y-2">
					<p class="text-sm whitespace-pre-wrap">{{ message.parsed.text }}</p>
					<div class="flex flex-wrap gap-2">
						<HoverTerm
							v-for="(t, i) in message.parsed.terms"
							:key="i"
							:term="{ label: t.text, description: t.info }"
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
	},
	components: { HoverTerm },
}
</script>
