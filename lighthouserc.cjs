module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 8766',
      startServerReadyPattern: 'Local:',
      url: ['/', '/install.html', '/help.html', '/integrations/player-guide.html'].map(
        (path) => 'http://127.0.0.1:8766' + path,
      ),
      numberOfRuns: 3,
      settings: { chromeFlags: '--no-sandbox', onlyCategories: ['performance', 'seo'] },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 4500, aggregationMethod: 'median' },
        ],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
        'categories:seo': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
        'total-blocking-time': ['error', { maxNumericValue: 300, aggregationMethod: 'median' }],
        'resource-summary:script:size': ['error', { maxNumericValue: 400000 }],
      },
    },
  },
};
