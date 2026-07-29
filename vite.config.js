import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    // `lib/supabaseClient` s'initialise à l'import et lève sur une URL vide : sans ces
    // valeurs factices, tout fichier de test qui touche un magasin échouait au chargement
    // sur une machine sans .env (c'était le cas de useClientsStore et stats). Aucune
    // requête n'est émise en test, seule la construction du client a besoin d'une URL.
    env: {
      VITE_SUPABASE_URL: 'https://tests.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
