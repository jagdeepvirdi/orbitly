import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Fire-and-forget API calls after an optimistic local update deliberately
      // swallow the error (state already reflects the intent; a retry-on-next-tick
      // or "stays put" comment covers the failure case) — this is a repo-wide
      // pattern, not an oversight.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // This React-Compiler-oriented rule flags several already-guarded
      // "run once on mount" / "act once when a derived condition crosses a
      // threshold" effects as errors. They're deliberate and safe (dependency
      // arrays prevent re-firing); keep it visible as a warning rather than
      // blocking the build.
      'react-hooks/set-state-in-effect': 'warn',
      // Mosaic Life's brand accent is user-selectable (see ACCENT_SWATCHES in
      // src/utils/colorUtils.js) and driven entirely through the --accent /
      // --accent-soft / --glow CSS vars computed in appStore.js. Writing the
      // old fixed brand hex directly is how the rebrand's accent picker
      // silently stopped applying to whole sections before — use var(--accent)
      // instead. Genuinely fixed/semantic colors (category palettes, confetti,
      // etc.) are expected to trip this; add an eslint-disable-line with a
      // one-line reason rather than removing the rule.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/#6366f1|#a855f7/]",
          message: "Hardcoded old brand color — use var(--accent)/var(--accent-soft)/var(--glow) so it follows the user's accent picker. If this is a genuinely fixed semantic color, add // eslint-disable-line no-restricted-syntax with a reason.",
        },
        {
          selector: "TemplateElement[value.raw=/#6366f1|#a855f7/]",
          message: "Hardcoded old brand color in a template literal — use var(--accent)/var(--accent-soft)/var(--glow) so it follows the user's accent picker. If this is a genuinely fixed semantic color, add // eslint-disable-line no-restricted-syntax with a reason.",
        },
      ],
    },
  },
])
