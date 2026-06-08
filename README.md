# Mob Timer

A shared mob programming timer built with SvelteKit and PeerJS.

Mob Timer creates a room link that teammates can open together. Timer state and the mobster list sync between browsers over WebRTC, with local storage used to restore state on refresh.

## Demo

https://oscargullberg.github.io/mob-timer/

## Development

Requires Node.js 24

```sh
npm install
npm run dev
```

## Analytics

Set `VITE_UMAMI_WEBSITE_ID` at build time to enable Umami page view analytics.
The tracker uses `https://cloud.umami.is/script.js` by default. Set
`VITE_UMAMI_SCRIPT_URL` to use a self-hosted Umami script.

## Checks

```sh
npm test
npm run check
npm run lint
npm run build
npm audit --audit-level=moderate
```

## Deploy

Pushes to `main` now deploy automatically through GitHub Actions.

```sh
npm run deploy
```
