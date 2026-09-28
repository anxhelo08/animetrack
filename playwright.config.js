const {defineConfig,devices}=require('@playwright/test');

module.exports=defineConfig({
  testDir:'./tests/e2e',
  testMatch:'**/*.spec.js',
  timeout:90000,
  expect:{timeout:10000},
  fullyParallel:false,
  workers:1,
  retries:process.env.CI?1:0,
  reporter:process.env.CI?'line':'list',
  use:{baseURL:'http://127.0.0.1:8765',trace:'retain-on-failure'},
  webServer:{
    command:'npm run preview -- --port 8765',
    url:'http://127.0.0.1:8765',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  },
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'iphone-chromium',use:{...devices['iPhone 15'],browserName:'chromium'}},
    {name:'iphone-webkit',use:{...devices['iPhone 15'],browserName:'webkit'}}
  ]
});
