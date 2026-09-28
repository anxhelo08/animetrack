'use strict';

module.exports = async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const mode=String(req.query?.mode||'');
  const headers={Accept:'application/json','User-Agent':'AnimeTrack/12.15.2 (+https://animetrack-flax.vercel.app)'};
  let target='',ttl=900;
  if(mode==='search'){
    const q=String(req.query?.q||'').trim().slice(0,120);
    if(q.length<2)return res.status(400).json({error:'Query too short'});
    target='https://v3-cinemeta.strem.io/catalog/movie/top/search='+encodeURIComponent(q)+'.json';
    ttl=900;
  }else if(mode==='meta'){
    const id=String(req.query?.id||'').trim();
    if(!/^tt\d+$/.test(id))return res.status(400).json({error:'Invalid IMDb ID'});
    target='https://v3-cinemeta.strem.io/meta/movie/'+encodeURIComponent(id)+'.json';
    ttl=86400;
  }else{
    return res.status(400).json({error:'Invalid mode'});
  }
  try{
    const upstream=await fetch(target,{headers,redirect:'follow'});
    if(!upstream.ok)return res.status(upstream.status).json({error:'Cinemeta upstream '+upstream.status});
    const data=await upstream.json();
    res.setHeader('Cache-Control','public, s-maxage='+ttl+', stale-while-revalidate=86400');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.status(200).json(data);
  }catch(err){
    console.error('Cinemeta proxy failed',err);
    return res.status(502).json({error:'Movie metadata temporarily unavailable'});
  }
};
