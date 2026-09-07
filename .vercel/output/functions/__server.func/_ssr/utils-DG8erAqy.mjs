import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-DG8erAqy.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function newId() {
	return crypto.randomUUID();
}
//#endregion
export { newId as n, cn as t };
