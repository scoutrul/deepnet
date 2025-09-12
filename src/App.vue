<template>
  <div id="app">
    <MainApp />
	</div>
</template>

<script>
import MainApp from '@/components/MainApp.vue'

export default {
	name: 'App',
  components: {
    MainApp
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>