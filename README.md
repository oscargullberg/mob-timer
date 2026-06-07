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
