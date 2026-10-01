import {test,expect} from '@playwright/test';

test('real bundled SDK boots with strict CSP and immutable configuration',async({page})=>{
 const errors=[],violations=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{
  localStorage.setItem('animetrack_cloud_config_v1',JSON.stringify({url:'https://invalid.example',key:'fake'}));
  window.__cspViolations=[];
  document.addEventListener('securitypolicyviolation',e=>window.__cspViolations.push(e.violatedDirective+': '+e.blockedURI));
 });
 // No production account or database is touched by this guest-only SDK test.
 await page.route('https://kwherbtspqirfrehqlfd.supabase.co/**',route=>route.abort());
 await page.route('https://graphql.anilist.co',route=>route.fulfill({contentType:'application/json',body:'{"data":{"Page":{"media":[],"pageInfo":{"hasNextPage":false}}}}'}));
 await page.goto('/');
 await page.locator('[data-welcome-auth="login"]').click();
 await expect(page.locator('#account-modal.show')).toBeVisible();
 await expect(page.locator('#account-setup')).toHaveCount(0);
 await expect(page.locator('[style]')).toHaveCount(0);
 const result=await page.evaluate(()=>{
  const node=document.createElement('div');
  window.ATHTML.renderHTML(node,window.ATHTML.html`<p>${'<img src=x onerror="window.__xss=1">'}</p>`);
  return {config:window.ANIMETRACK_CONFIG.url,frozen:Object.isFrozen(window.ANIMETRACK_CONFIG),sdk:typeof window.supabase.createClient,text:node.textContent,images:node.querySelectorAll('img').length,violations:window.__cspViolations};
 });
 expect(result.config).toBe('https://kwherbtspqirfrehqlfd.supabase.co');
 expect(result.frozen).toBe(true);expect(result.sdk).toBe('function');expect(result.images).toBe(0);
 expect(result.text).toContain('<img');violations.push(...result.violations);
 expect(violations).toEqual([]);expect(errors).toEqual([]);
 expect(requests.some(url=>url.includes('/assets/supabase-client.'))).toBe(true);
 expect(requests.some(url=>url.includes('cdn.jsdelivr.net')||url.includes('invalid.example'))).toBe(false);
});
