import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';

const prod = process.env.NODE_ENV === 'production';

/** @type {import('@sveltejs/kit').Config} */
const adapterToUse = prod
	? adapter({ fallback: 'index.html', pages: 'build', assets: 'build' })
	: adapter();

const config = {
	preprocess: preprocess(),
	adapter: adapter(),
	kit: {
		adapter: adapterToUse,
		paths: {
			base: prod ? '/mob-timer' : ''
		}
	}
};

export default config;
