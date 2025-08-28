<template>
	<div class="rounded-md border border-slate-200 bg-slate-50 p-3">
		<div class="mb-2 text-xs font-semibold text-slate-700">Опции</div>
		
		<!-- Credit limit information -->
		<div v-if="creditLimitInfo" class="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
			<div class="flex items-center justify-between">
				<div class="text-amber-800">
					<strong>Limit:</strong> {{ creditLimitInfo.availableTokens }} tokens
				</div>
				<button 
					@click="resetCreditLimits"
					class="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded transition-colors"
					title="Reset limits"
				>
					×
				</button>
			</div>
		</div>
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
	computed: {
		creditLimitInfo() {
			try {
				const lastError = localStorage.getItem('lastOpenRouterError')
				if (lastError) {
					const errorInfo = JSON.parse(lastError)
					if (errorInfo.code === 402 && errorInfo.availableTokens) {
						return errorInfo
					}
				}
				return null
			} catch (e) {
				return null
			}
		}
	},
	watch: {
		detailLevel() { this.emitChange() },
		usePrev() { this.emitChange() },
	},
	methods: {
		emitChange() {
			const payload = { detailLevel: this.detailLevel, usePrev: this.usePrev }
			this.$emit('input', payload)
			this.$emit('change', payload)
		},
		resetCreditLimits() {
			localStorage.removeItem('lastOpenRouterError')
			this.$forceUpdate() // Принудительно обновляем компонент
		},
	},
}
</script>
