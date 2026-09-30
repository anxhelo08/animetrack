import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { createAccountHandler } from './handler.js';
const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);
Deno.serve(createAccountHandler({
  admin,
  secret,
  clientForToken: (token: string) => createClient(url, publicKey, { ...options, global: { headers: { Authorization: 'Bearer ' + token } } }),
}));
