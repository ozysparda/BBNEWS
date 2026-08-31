---
name: Admin Select and session guards
description: Durable UI and authentication constraints for admin pages.
---

Radix Select items must never use an empty string as their value; represent an “all” or cleared filter with a non-empty sentinel and normalize it before sending the API query.

**Why:** An empty SelectItem value can throw during render and appear as a blank page. Separately, an expired admin JWT otherwise leaves a protected page showing an unhelpful loading/error state.

**How to apply:** Use a sentinel such as `all` for unfiltered Select options, and when a protected admin request returns 401, remove `admin_token` and navigate to the admin login route.