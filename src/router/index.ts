import { createRouter, createWebHistory } from 'vue-router'
import PublicView from '../views/PublicView.vue'
import ChefView from '../views/ChefView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: PublicView },
    { path: '/cocina', component: ChefView },
  ],
})
