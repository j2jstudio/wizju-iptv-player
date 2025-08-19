// src/options.ts
import { createApp } from 'vue';
import OptionsApp from './OptionsApp.vue'; // A dedicated root component for the options page.
import router from './router';
import { createPinia } from 'pinia';
import { createNavigationService } from './services/navigationService';
import './assets/tailwind-themes/stream-complete.css';

const app = createApp(OptionsApp);

app.use(createPinia());
app.use(router);

// Initialize the navigation service
createNavigationService(router);

app.mount('#app');
