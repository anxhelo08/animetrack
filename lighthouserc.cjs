module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 8766',
      startServerReadyPattern: 'Local:',
      url: ['http://127.0.0.1:8766/'],
      numberOfRuns: 3,
      settings: { chromeFlags: '--no-sandbox', onlyCategories: ['performance'] },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 4500, aggregationMethod: 'median' },
        ],
        'total-blocking-time': ['error', { maxNumericValue: 300, aggregationMethod: 'median' }],
        'resource-summary:script:size': ['error', { maxNumericValue: 400000 }],
      },
    },
  },
};
