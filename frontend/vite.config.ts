import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'

import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [UnoCSS(),react()],
})
