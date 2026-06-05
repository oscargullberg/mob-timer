import adapter from '@sveltejs/adapter-static';

const prod = process.env.NODE_ENV === 'production';

/** @type {import('@sveltejs/kit').Config} */
const adapterToUse = prod
	? adapter({ fallback: 'index.html', pages: 'build', assets: 'build' })
	: adapter();

const config = {
	kit: {
		adapter: adapterToUse,
		paths: {
			base: prod ? '/mob-timer' : ''
		}
	}
};

export default config;
