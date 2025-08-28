<template>
	<div class="rounded-md border border-slate-200 bg-slate-50 p-3">
		<div class="mb-2 text-xs font-semibold text-slate-700">Опции</div>
		<fieldset class="mb-3">
			<legend class="mb-1 text-xs text-slate-600">Подробность ответа</legend>
			<label class="mb-1 flex items-center gap-2 text-sm text-slate-700">
				<input type="radio" name="detail" value="short" v-model="detailLevel" />
				<span>Краткий</span>
			</label>
			<label class="mb-1 flex items-center gap-2 text-sm text-slate-700">
				<input type="radio" name="detail" value="extended" v-model="detailLevel" />
				<span>Развернутый</span>
			</label>
			<label class="flex items-center gap-2 text-sm text-slate-700">
				<input type="radio" name="detail" value="max" v-model="detailLevel" />
				<span>Максимальный</span>
			</label>
		</fieldset>
		<label class="flex items-center gap-2 text-sm text-slate-700">
			<input type="checkbox" v-model="usePrev" />
			<span>Использовать контекст предыдущего ответа</span>
		</label>
	</div>
</template>

<script>
export default {
	name: 'OptionsPanel',
	props: {
		value: { type: Object, default: () => ({ detailLevel: 'extended', usePrev: true }) },
	},
	data() {
		return {
			detailLevel: this.value.detailLevel || 'extended',
			usePrev: this.value.usePrev ?? true,
		}
	},
	watch: {
		detailLevel() { this.emitChange() },
		usePrev() { this.emitChange() },
	},
	methods: {
		emitChange() {
			this.$emit('input', { detailLevel: this.detailLevel, usePrev: this.usePrev })
		},
	},
}
</script>
