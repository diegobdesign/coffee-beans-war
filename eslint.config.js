// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Implementation-defined across V8 / JavaScriptCore / SpiderMonkey. Banned inside the sim.
// Math.fround is deliberately NOT here: it is exactly specified and deterministic.
const NON_DETERMINISTIC = [
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'exp',
  'expm1',
  'log',
  'log1p',
  'log2',
  'log10',
  'hypot',
  'cbrt',
  'sinh',
  'cosh',
  'tanh',
  'random',
];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'docs/**', 'public/**', '.vercel/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // 1. The sim is pure. Nothing from the app may leak into it. No clock. No transcendentals.
  {
    files: ['src/sim/**/*.ts', 'src/bots/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'three',
                'three/*',
                '@supabase/*',
                '**/render/**',
                '**/ui/**',
                '**/net/**',
                '**/core/store',
              ],
              message: 'The sim is pure. See ARCHITECTURE.md §1.5.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'The sim has no clock. Pass the turn index.' },
        { name: 'performance', message: 'The sim has no clock.' },
      ],
      'no-restricted-properties': [
        'error',
        ...NON_DETERMINISTIC.map((property) => ({
          object: 'Math',
          property,
          message:
            'Implementation-defined across V8 / JSC / SpiderMonkey. Use src/sim/trig.ts or plain arithmetic. ARCHITECTURE.md §3.4.',
        })),
      ],
    },
  },
  // 3. Nothing outside src/render and src/assets may import three.
  {
    files: ['src/{sim,net,ui,core,bots}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['three', 'three/*'],
              message: 'Only src/render and src/assets may import three.',
            },
          ],
        },
      ],
    },
  },
  { files: ['eslint.config.js'], ...tseslint.configs.disableTypeChecked },
);
