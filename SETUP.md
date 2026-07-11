# Transition Desk Setup

## GitHub

The local repo is ready. To publish it as a normal GitHub repo:

```bash
git remote add origin https://github.com/hisamuddin/transitiondesk.git
git push -u origin main
```

Create the empty GitHub repo first at:

```text
https://github.com/new
```

Recommended repo name:

```text
transitiondesk
```

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Enable Google under Supabase Auth providers.
4. Add the hosted URL as an allowed redirect URL:

```text
https://career-transition-os.sabbusiddique40.chatgpt.site
```

5. Set these hosting environment variables:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_ADMIN_EMAILS=sabbusiddique40@gmail.com
```

## Admin Analytics

The Admin tab reads:

- total users
- active users in the last 7 days
- total opportunities
- total interviews
- total activity events
- recent login/action activity

Activity is saved in `activity_events`.

## Custom Domain

Buy a domain such as `transitiondesk.com`, `transitiondesk.app`, or `transitiondesk.site`.

After purchase, attach it to the Sites project and configure the DNS records Sites returns.
