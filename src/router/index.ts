// Composables
import { createRouter, createWebHistory } from "vue-router";

import DefaultRoute from "@/layouts/default/Default.vue";
import HomeView from "@/views/Home.vue";

const routes = [
  {
    path: '/',
    component: DefaultRoute,
    children: [
      {
        path: '',
        name: 'Home',
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: HomeView
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

export default router
