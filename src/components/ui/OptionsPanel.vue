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

		<!-- Scene Selection -->
		<fieldset class="mb-4">
			<legend class="mb-2 text-xs font-semibold text-slate-700">Выбор сцены</legend>
			<label class="mb-2 flex items-center gap-2 text-sm text-slate-700">
				<input type="radio" name="scene" value="technical-interview" v-model="scene" />
				<span>🎤 Техническое интервью</span>
			</label>
			<label class="flex items-center gap-2 text-sm text-slate-700">
				<input type="radio" name="scene" value="screening" v-model="scene" />
				<span>📋 Скрининг</span>
			</label>
		</fieldset>

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


		<!-- Context Settings -->
		<fieldset class="mb-4">
			<legend class="mb-2 text-xs font-semibold text-slate-700">Контекст для бота</legend>
			<div class="mb-3">
				<label class="block mb-1 text-xs text-slate-600">Описание вакансии</label>
				<textarea
						v-model="jobDescription"
						@input="onJobDescriptionInput"
						@focus="onTextareaFocus"
						ref="jobDescriptionTextarea"
						placeholder="Вставьте описание вакансии, требования, обязанности..."
						class="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						:style="{ height: jobDescriptionHeight + 'px' }"
					></textarea>
				<div class="flex justify-between items-center mt-1">
					<div class="flex items-center gap-2">
						<span class="text-xs" :class="getTextLengthColor(jobDescription.length, 10000)">
							{{ jobDescription.length }}/10000
						</span>
						<div class="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
							<div 
								class="h-full transition-all duration-300 rounded-full"
								:class="getProgressBarColor(jobDescription.length, 10000)"
								:style="{ width: Math.min((jobDescription.length / 10000) * 100, 100) + '%' }"
							></div>
						</div>
					</div>
					<button 
						v-if="jobDescription"
						@click="clearJobDescription"
						class="text-xs text-red-500 hover:text-red-700"
						title="Очистить"
					>
						Очистить
					</button>
				</div>
			</div>
			<div class="mb-3">
				<label class="block mb-1 text-xs text-slate-600">Текст резюме</label>
				<textarea
					v-model="resumeText"
					@input="onResumeTextInput"
					@focus="onTextareaFocus"
					ref="resumeTextarea"
					placeholder="Вставьте текст резюме, опыт работы, навыки..."
					class="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					:style="{ height: resumeTextHeight + 'px' }"
				></textarea>
				<div class="flex justify-between items-center mt-1">
					<div class="flex items-center gap-2">
						<span class="text-xs" :class="getTextLengthColor(resumeText.length, 10000)">
							{{ resumeText.length }}/10000
						</span>
						<div class="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
							<div 
								class="h-full transition-all duration-300 rounded-full"
								:class="getProgressBarColor(resumeText.length, 10000)"
								:style="{ width: Math.min((resumeText.length / 10000) * 100, 100) + '%' }"
							></div>
						</div>
					</div>
					<button 
						v-if="resumeText"
						@click="clearResumeText"
						class="text-xs text-red-500 hover:text-red-700"
						title="Очистить"
					>
						Очистить
					</button>
				</div>
			</div>
		</fieldset>
	</div>
</template>

<script>
export default {
	name: 'OptionsPanel',
	props: {
		value: { 
			type: Object, 
			default: () => ({ 
				detailLevel: 'extended', 
				usePrev: true,
				scene: 'technical-interview',
				jobDescription: '',
				resumeText: ''
			}) 
		},
	},
	data() {
		return {
			detailLevel: this.value.detailLevel || 'extended',
			usePrev: this.value.usePrev ?? true,
			scene: this.value.scene || 'technical-interview',
			jobDescription: this.value.jobDescription || '',
			resumeText: this.value.resumeText || '',
			jobDescriptionHeight: 100, // Initial height
			resumeTextHeight: 100, // Initial height
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
		scene() { this.emitChange() },
		jobDescription() { this.emitChange() },
		resumeText() { this.emitChange() },
	},
	mounted() {
		// Загружаем сохраненные настройки из localStorage
		this.loadSavedSettings()
		// Инициализируем высоту textarea
		this.$nextTick(() => {
			this.updateTextareaHeight(this.$refs.jobDescriptionTextarea, 100)
			this.updateTextareaHeight(this.$refs.resumeTextarea, 100)
		})
	},
	methods: {
		emitChange() {
			const payload = { 
				detailLevel: this.detailLevel, 
				usePrev: this.usePrev,
				scene: this.scene,
				jobDescription: this.jobDescription,
				resumeText: this.resumeText
			}
			this.$emit('input', payload)
			this.$emit('change', payload)
			
			// Сохраняем настройки в localStorage
			this.saveSettings(payload)
		},
		resetCreditLimits() {
			localStorage.removeItem('lastOpenRouterError')
			this.$forceUpdate() // Принудительно обновляем компонент
		},
		onJobDescriptionInput() {
			this.updateTextareaHeight(this.$refs.jobDescriptionTextarea, 100)
		},
		onResumeTextInput() {
			this.updateTextareaHeight(this.$refs.resumeTextarea, 100)
		},
		onTextareaFocus() {
			this.updateTextareaHeight(this.$refs.jobDescriptionTextarea, 100)
			this.updateTextareaHeight(this.$refs.resumeTextarea, 100)
		},
		updateTextareaHeight(textarea, minHeight) {
			if (!textarea) return
			textarea.style.height = 'auto' // Сбрасываем высоту для пересчета scrollHeight
			const scrollHeight = textarea.scrollHeight
			// Ограничиваем максимальную высоту до 300px
			const maxHeight = 300
			const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
			textarea.style.height = newHeight + 'px'
			
			// Если контент превышает максимальную высоту, добавляем скролл
			if (scrollHeight > maxHeight) {
				textarea.style.overflowY = 'auto'
			} else {
				textarea.style.overflowY = 'hidden'
			}
		},
		clearJobDescription() {
			this.jobDescription = ''
			this.jobDescriptionHeight = 100
			this.$nextTick(() => {
				this.updateTextareaHeight(this.$refs.jobDescriptionTextarea, 100)
			})
		},
		clearResumeText() {
			this.resumeText = ''
			this.resumeTextHeight = 100
			this.$nextTick(() => {
				this.updateTextareaHeight(this.$refs.resumeTextarea, 100)
			})
		},
		
		// Методы для индикаторов прогресса
		getTextLengthColor(length, maxLength) {
			const percentage = (length / maxLength) * 100
			if (percentage >= 90) return 'text-red-600 font-medium'
			if (percentage >= 75) return 'text-orange-600 font-medium'
			if (percentage >= 50) return 'text-yellow-600 font-medium'
			return 'text-slate-500'
		},
		
		getProgressBarColor(length, maxLength) {
			const percentage = (length / maxLength) * 100
			if (percentage >= 90) return 'bg-red-500'
			if (percentage >= 75) return 'bg-orange-500'
			if (percentage >= 50) return 'bg-yellow-500'
			return 'bg-green-500'
		},
		
		// Сохранение настроек в localStorage
		saveSettings(settings) {
			try {
				localStorage.setItem('deepnet-settings', JSON.stringify(settings))
			} catch (e) {
				console.warn('Failed to save settings to localStorage:', e)
			}
		},
		
		// Загрузка настроек из localStorage
		loadSavedSettings() {
			try {
				const saved = localStorage.getItem('deepnet-settings')
				if (saved) {
					const settings = JSON.parse(saved)
					// Применяем сохраненные настройки, если они есть
					if (settings.scene) this.scene = settings.scene
					if (settings.jobDescription) this.jobDescription = settings.jobDescription
					if (settings.resumeText) this.resumeText = settings.resumeText
					if (settings.detailLevel) this.detailLevel = settings.detailLevel
					if (settings.usePrev !== undefined) this.usePrev = settings.usePrev
				}
			} catch (e) {
				console.warn('Failed to load settings from localStorage:', e)
			}
		},
	},
}
</script>
