import Vue from 'vue'
import VueCompositionApi from '@vue/composition-api'
import App from './App.vue'
import './styles/components.css'
import './styles/terms.css'

Vue.use(VueCompositionApi)

new Vue({
	render: (h) => h(App),
}).$mount('#app')
