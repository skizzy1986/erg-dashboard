---
category: Feedback
---

# ErrorFallback

The full-screen crash screen rendered by the Sentry error boundary when a render
throws. Deliberately dependency-free and self-contained so it can never itself
throw — it imports nothing but the theme.

Fills the viewport (`min-height: 100vh`) on the app background, centred: a red
`SOMETHING WENT WRONG` headline, a short reassurance that the error was reported,
and a green `TRY AGAIN` button wired to `resetError`. Carries `role="alert"`.

```jsx
<ErrorFallback resetError={() => window.location.reload()} />
```
