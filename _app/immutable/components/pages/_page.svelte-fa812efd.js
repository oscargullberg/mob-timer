import{S as s,i as r,s as i,o as c}from"../../chunks/index-30774e33.js";import{c as e,d as l}from"../../chunks/singletons-8f4ca8c4.js";e.disable_scroll_handling;const d=e.goto;e.invalidate;e.invalidateAll;e.prefetch;e.prefetch_routes;e.before_navigate;e.after_navigate;function f(o){var t=sessionStorage.redirect;delete sessionStorage.redirect;const a=Date.now().toString(36),n=t&&t!=location.pathname?t:`${l}/${a}`;return c(async()=>d(n)),[]}class p extends s{constructor(t){super(),r(this,t,f,null,i,{})}}export{p as default};