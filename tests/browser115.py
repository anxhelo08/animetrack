"""Smoke checks with a stubbed account — never contacts the user's actual Supabase data."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
now=datetime.now(timezone.utc).isoformat()
payload={
  'anime':[{'id':'demo-115','title':'The Daily Quest','status':'watching','cover':'','updatedAt':now,'createdAt':now,'seasons':[{'id':'season-1','title':'Season 1','total':12,'watched':[1,2],'releaseStatus':'FINISHED','episodes':[{'number':3,'title':'The Next Chapter'}]}]}],
  'history':[{'id':'demo-115','seasonId':'season-1','episode':2,'action':'watched','date':now}],
  'preferences':{'weeklyGoal':6,'notificationRead':[]}
}
stub="""(()=>{
 const payload=__PAYLOAD__;let revision='2026-09-26T15:00:00.000000+00:00';
 const chain=table=>{let q={};for(const name of ['select','eq','order','limit','in','not','or','insert','upsert','update','range','neq','gte','lte','contains'])q[name]=()=>q;
 q.maybeSingle=async()=>({data:table==='anime_libraries'?{payload,updated_at:revision}:null,error:null});
 q.single=q.maybeSingle;q.then=(yes,no)=>Promise.resolve({data:[],error:null}).then(yes,no);return q;};
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'demo-115-user',email:'demo@example.org'}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:chain,rpc:()=>chain('rpc')})};
})();""".replace('__PAYLOAD__',json.dumps(payload,ensure_ascii=False))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(320,740),(390,844),(430,932),(1365,850)]:
  ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=width<700,has_touch=width<700,user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1' if width<700 else None)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
  # Network navigation is disabled in this environment; render the real HTML/CSS/JS in memory.
  html=(ROOT/'index.html').read_text()
  scripts=re.findall(r'<script[^>]+src="([^"]+)"[^>]*></script>',html)
  clean=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
  clean=re.sub(r'<link[^>]+rel="stylesheet"[^>]*>','',clean)
  page.set_content(clean,wait_until='domcontentloaded')
  styles=re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>',html)
  # The page has a single concatenated stylesheet line; parse href independently.
  styles=re.findall(r'<link rel="stylesheet" href="([^"]+)"',html)
  for css in styles:page.add_style_tag(content=(ROOT/css.lstrip('/')).read_text())
  page.add_script_tag(content='Object.defineProperty(window,"localStorage",{configurable:true,value:(()=>{const store=new Map();return {getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}})()});')
  page.add_script_tag(content=stub)
  for src in scripts:
   if src.startswith('/assets/'):
    page.add_script_tag(content=(ROOT/src.lstrip('/')).read_text())
  page.wait_for_timeout(250)
  day=page.locator('#at-iphone-feed .at115-day-summary' if width<700 else '#at115-desktop-day .at115-day')
  assert day.count()==1, f'{width}: missing daily panel'
  assert day.is_visible(),f'{width}: hidden daily panel'
  assert 'The Daily Quest' in day.inner_text() or page.locator('#at-iphone-feed .at115-day-summary').filter(has_text='The Daily Quest').count()==1,f'{width}: missing library focus'
  outer=page.evaluate('({scroll:document.documentElement.scrollWidth,inner:window.innerWidth,top:getComputedStyle(document.querySelector(".at115-day-summary, .at115-day")).paddingTop})')
  assert outer['scroll']<=outer['inner']+2, f'{width}: horizontal overflow {outer}'
  if width<700:
   assert page.locator('#at-iphone-feed .at114-top-tabs').is_visible()
   assert page.locator('#at-iphone-feed .at115-day-summary').count()==1
   page.locator('#at-iphone-feed [data-day-action="toggle"]').click()
   assert page.locator('#at-iphone-feed .at115-day-more').count()==1
   assert page.locator('#at-iphone-feed .at115-day-focus').is_visible()
   page.locator('#at-iphone-feed [data-day-action="mark-next"]').click()
   assert 'EP 4' in page.locator('#at-iphone-feed').inner_text() or 'E04' in page.locator('#at-iphone-feed').inner_text(),f'{width}: next episode not advanced'
   assert page.locator('#at-iphone-feed [data-day-action="undo"]').count()==1,f'{width}: no undo'
   page.locator('#at-iphone-feed [data-day-action="undo"]').click()
   assert page.locator('#at-iphone-feed [data-day-action="undo"]').count()==0
  else:
   assert page.locator('#at115-desktop-day [data-day-action="recommendations"]').is_visible()
  shot=Path('/mnt/data')/f'animetrack-11-5-{"mobile" if width<700 else "desktop"}-{width}.png';page.screenshot(path=str(shot),full_page=False)
  print('BROWSER_PASS',width,{'horizontal':outer['scroll']-outer['inner'],'day':day.count(),'page_errors':errors,'screenshot':str(shot)},flush=True)
  assert not errors, f'{width}: browser page errors {errors}'
  ctx.close()
 browser.close()
