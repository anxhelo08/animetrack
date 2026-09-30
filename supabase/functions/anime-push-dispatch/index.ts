import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import webpush from 'npm:web-push@3.6.7';
import { resolveVapid } from '../_shared/push-keys.js';
import { createDispatcher } from './handler.js';
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
// Compatibility default for existing installations; production operators override VAPID_SUBJECT.
const subject = Deno.env.get('VAPID_SUBJECT') || 'https://animetrack-flax.vercel.app';
const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createDispatcher({admin,subject,getVapid:()=>resolveVapid({admin,publicKey,privateKey,generate:()=>webpush.generateVAPIDKeys()}),secret:Deno.env.get('ANIMETRACK_CRON_SECRET') || '',send:(subscription: object,payload: string,options: object)=>webpush.sendNotification(subscription,payload,options)}));
