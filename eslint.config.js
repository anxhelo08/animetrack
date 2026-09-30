import globals from 'globals';

// Baseline for the legacy modules; new rendering code cannot add unsafe DOM sinks.
export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['api/**/*.js', 'server/**/*.js', 'supabase/functions/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: { 'no-eval': 'error', 'no-new-func': 'error', 'no-implied-eval': 'error' },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
    },
  },
  {
    files: ['src/**/*.js'],
    ignores: ['src/modules/safe-html.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]',
          message: 'Use the shared HTML renderer.',
        },
        {
          selector: 'CallExpression[callee.property.name="insertAdjacentHTML"]',
          message: 'Use the shared HTML renderer.',
        },
      ],
    },
  },
];
