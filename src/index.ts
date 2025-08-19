// src/popup.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { createNavigationService } from './services/navigationService';
import './assets/tailwind-themes/stream-complete.css';

// Ensure the router starts at a specific page for the popup.
// Using the hash mode is important for extensions.
router.push('/');

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Initialize the navigation service
createNavigationService(router);

app.mount('#app');
