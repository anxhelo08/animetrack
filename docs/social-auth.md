# Hyrja me Google dhe Apple

Integrimi përdor sesionin ekzistues Supabase dhe të njëjtën bibliotekë për llogarinë. Kredencialet private vendosen vetëm në Supabase, kurrë në kodin e faqes ose në localStorage. Faqja kontrollon `/auth/v1/settings` kur hapet hyrja dhe aktivizon automatikisht butonat e provider-ëve të konfiguruar. Hyrja me email vazhdon të funksionojë.

## Google

1. Krijo një projekt në Google Cloud dhe përgatit Google Auth Platform (audience, branding, clients).
2. Krijo një OAuth client të tipit **Web application**.
3. Vendos **Authorized JavaScript origins**: `https://animetrack-flax.vercel.app`.
4. Vendos **Authorized redirect URI**: `https://kwherbtspqirfrehqlfd.supabase.co/auth/v1/callback`.
5. Te [Supabase → Authentication → Google](https://supabase.com/dashboard/project/kwherbtspqirfrehqlfd/auth/providers), aktivizo Google dhe vendos Client ID dhe Client Secret.
6. Përdor scopes bazë: `openid`, email dhe profile. Nëse Google është në Testing, shto përdoruesit testues; për përdorim publik konfiguro audience përkatëse.

## Apple

1. Nevojitet llogari Apple Developer me mundësinë Sign in with Apple.
2. Krijo App ID me Sign in with Apple dhe një **Services ID** për faqen.
3. Website domain: `kwherbtspqirfrehqlfd.supabase.co`. Return URL: `https://kwherbtspqirfrehqlfd.supabase.co/auth/v1/callback`.
4. Krijo signing key dhe gjenero client secret sipas udhëzimeve zyrtare.
5. Te Supabase → Authentication → Apple, vendos Services ID si Client ID për web dhe client secret. Aktivizo provider-in.
6. Zëvendëso secret-in sipas afatit të Apple (maksimumi gjashtë muaj për OAuth web).

## Kthimi dhe kontrolli

- Supabase Site URL: `https://animetrack-flax.vercel.app/`.
- Redirect allow list përfshin këtë URL të saktë.
- Pas aktivizimit, hap Hyr/Krijo llogari dhe kontrollo opsionet e hyrjes. Butoni përkatës aktivizohet pa deploy tjetër.
- Provo hyrjen me llogari testuese dhe verifiko bibliotekën, rifreskimin dhe daljen. Kontrollo edhe Apple Hide My Email.
- OAuth nuk anashkalon zgjedhjen ose miratimin e përdoruesit te Google/Apple. Llogaria mbetet private sipas rrjedhës ekzistuese.

Burime: [Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple).
