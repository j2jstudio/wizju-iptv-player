// Minimal configuration - themes are imported on demand via CSS files
export default {
  content: [
    // Keep basic scan paths to avoid warnings, but the actual theme is imported via CSS files
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./pages/**/*.html",
  ],
  theme: {},
  plugins: [],
};
