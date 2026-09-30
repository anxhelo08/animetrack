import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import webpush from 'npm:web-push@3.6.7';
import { resolveVapid } from '../_shared/push-keys.js';
import { createConfigHandler } from './handler.js';
const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createConfigHandler({getPublicKey:async()=> (await resolveVapid({admin,publicKey:Deno.env.get('VAPID_PUBLIC_KEY') || '',privateKey:Deno.env.get('VAPID_PRIVATE_KEY') || '',generate:()=>webpush.generateVAPIDKeys()})).publicKey,authenticate:async(token:string)=>{
 const {data,error} = await admin.auth.getUser(token);
 if(error || !data.user || data.user.is_anonymous)return false;
 const client = createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const active = await client.rpc('anime_has_active_session');return !active.error && active.data === true;
}}));
