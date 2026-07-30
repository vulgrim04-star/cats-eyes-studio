import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identité de la version construite.
//
// Sans elle, personne ne peut répondre à « est-ce que ma mise à jour est arrivée ? » : une
// PWA installée peut resservir sa page depuis le cache, et rien à l'écran ne distingue une
// version d'hier d'une version d'il y a cinq minutes. Vercel expose VERCEL_GIT_COMMIT_SHA
// au moment du build ; en local, « dev » suffit et neutralise la proposition de mise à jour.
const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'
const APP_BUILT_AT = new Date().toISOString()

/** Écrit la version dans un fichier servi tel quel, à côté du bundle.
 *
 *  L'application connaît la version qu'elle a chargée (compilée dans son code) ; ce fichier
 *  lui dit ce que le serveur sert MAINTENANT. C'est la comparaison des deux qui révèle
 *  qu'une nouvelle version attend d'être chargée. */
function versionManifest() {
  return {
    name: 'ces-version-manifest',
    apply: 'build',
    writeBundle(options) {
      const dir = options.dir ?? 'dist'
      writeFileSync(
        join(dir, 'version.json'),
        JSON.stringify({ version: APP_VERSION, builtAt: APP_BUILT_AT }),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionManifest()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_BUILT_AT__: JSON.stringify(APP_BUILT_AT),
  },
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
    // Les constantes injectées par `define` n'existent pas sous vitest : sans ces valeurs,
    // tout module important appVersion planterait au chargement des tests.
    define: {
      __APP_VERSION__: JSON.stringify('test'),
      __APP_BUILT_AT__: JSON.stringify('2026-01-01T00:00:00.000Z'),
    },
  },
})
