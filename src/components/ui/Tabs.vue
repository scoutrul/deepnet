<template>
  <div class="tabs-wrapper">
    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex gap-4">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="onChange(tab.key)"
          :class="[
            'px-3 py-2 text-sm font-medium border-b-2',
            current === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <slot :active="current"></slot>
  </div>
</template>

<script>
export default {
  name: 'Tabs',
  props: {
    value: {
      type: String,
      default: ''
    },
    tabs: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      current: this.value || (this.tabs && this.tabs.length > 0 ? this.tabs[0].key : '')
    }
  },
  watch: {
    value(val) {
      this.current = val
    },
    current(val) {
      this.$emit('input', val)
      this.$emit('change', val)
    }
  },
  methods: {
    onChange(key) {
      if (key === this.current) return
      this.current = key
    }
  }
}
</script>

<style scoped>
/* Компонент использует стили Tailwind из проекта */
</style>
