'use strict';

const MAL='https://api.myanimelist.net/v2';
const bearer=req=>{
  const h=String(req.headers?.authorization||'');
  const m=/^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim()||'';
};
const json=async r=>{try{return await r.json()}catch{return {}}};

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const token=bearer(req);
  if(!token)return res.status(401).json({error:'Missing MAL access token'});
  const action=String(req.query?.action||'');
  const headers={Accept:'application/json',Authorization:'Bearer '+token,'User-Agent':'AnimeTrack/13.5 (+https://animetrack-flax.vercel.app)'};
  try{
    if(req.method==='GET'&&action==='me'){
      const upstream=await fetch(MAL+'/users/@me?fields=id,name,picture',{headers});
      const data=await json(upstream);
      if(!upstream.ok)return res.status(upstream.status).json({error:data?.message||data?.error||'MAL profile '+upstream.status});
      return res.status(200).json(data);
    }
    if(req.method==='GET'&&action==='list'){
      const limit=Math.max(1,Math.min(1000,Number(req.query?.limit)||1000));
      const offset=Math.max(0,Math.min(100000,Number(req.query?.offset)||0));
      const params=new URLSearchParams({fields:'list_status,num_episodes,media_type,start_date,mean,main_picture',sort:'list_updated_at',limit:String(limit),offset:String(offset)});
      const upstream=await fetch(MAL+'/users/@me/animelist?'+params,{headers});
      const data=await json(upstream);
      if(!upstream.ok)return res.status(upstream.status).json({error:data?.message||data?.error||'MAL list '+upstream.status});
      return res.status(200).json(data);
    }
    if(req.method==='PATCH'&&action==='update'){
      const id=String(req.query?.id||'');
      if(!/^\d{1,12}$/.test(id))return res.status(400).json({error:'Invalid MAL anime id'});
      let body=req.body&&typeof req.body==='object'?req.body:{};if(typeof req.body==='string')try{body=JSON.parse(req.body)}catch{body={}};
      const allowed=new Set(['watching','completed','on_hold','dropped','plan_to_watch']);
      const status=String(body.status||'');
      if(!allowed.has(status))return res.status(400).json({error:'Invalid MAL status'});
      const form=new URLSearchParams();
      form.set('status',status);
      form.set('num_watched_episodes',String(Math.max(0,Math.min(10000,Math.floor(Number(body.num_watched_episodes)||0)))));
      const score=Math.max(0,Math.min(10,Number(body.score)||0));
      form.set('score',String(score));
      const upstream=await fetch(MAL+'/anime/'+encodeURIComponent(id)+'/my_list_status',{method:'PATCH',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:form});
      const data=await json(upstream);
      if(!upstream.ok)return res.status(upstream.status).json({error:data?.message||data?.error||'MAL update '+upstream.status});
      return res.status(200).json(data);
    }
    res.setHeader('Allow','GET,PATCH');
    return res.status(405).json({error:'Unsupported action or method'});
  }catch(err){
    console.error('MAL proxy failed',String(err?.message||err));
    return res.status(502).json({error:'MyAnimeList temporarily unavailable'});
  }
};
