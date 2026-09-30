import DOMPurify from 'dompurify';

const toString=value=>String(value??'');

function text(value,max=5000){
  const clean=DOMPurify.sanitize(toString(value),{
    ALLOWED_TAGS:[],
    ALLOWED_ATTR:[],
    KEEP_CONTENT:true
  });
  const parser=new DOMParser();
  const decoded=parser.parseFromString('<!doctype html><body>'+clean,'text/html').body.textContent||'';
  return decoded.replace(/\s+/g,' ').trim().slice(0,Math.max(0,Number(max)||5000));
}

function html(value){
  return DOMPurify.sanitize(toString(value),{
    USE_PROFILES:{html:true},
    FORBID_TAGS:['script','style','iframe','object','embed','form','input','button','textarea','select'],
    FORBID_ATTR:['style','srcdoc']
  });
}

function setHTML(node,markup){
  if(!node)return;
  window.ATHTML.renderHTML(node,html(markup));
}

window.ATSecurity136=Object.freeze({text,html,setHTML});
