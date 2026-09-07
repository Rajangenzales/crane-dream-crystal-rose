//#region node_modules/.nitro/vite/services/ssr/assets/format-BQrEX9ez.js
function formatMoney(amount, currency = "INR") {
	if (amount === null || amount === void 0 || amount === "") return "—";
	const n = typeof amount === "string" ? Number(amount) : amount;
	if (!Number.isFinite(n)) return "—";
	try {
		return new Intl.NumberFormat("en-IN", {
			style: "currency",
			currency,
			maximumFractionDigits: n % 1 === 0 ? 0 : 2
		}).format(n);
	} catch {
		return `${n}`;
	}
}
function formatDate(value) {
	if (!value) return "—";
	const d = /* @__PURE__ */ new Date(`${value}T00:00:00`);
	if (Number.isNaN(d.getTime())) return value;
	return new Intl.DateTimeFormat("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(d);
}
function formatCompactDate(value) {
	if (!value) return "";
	const d = /* @__PURE__ */ new Date(`${value}T00:00:00`);
	if (Number.isNaN(d.getTime())) return value;
	return new Intl.DateTimeFormat("en-IN", {
		day: "numeric",
		month: "short"
	}).format(d);
}
function toNumber(value) {
	if (value === null || value === void 0 || value === "") return null;
	const n = typeof value === "string" ? Number(value) : value;
	return Number.isFinite(n) ? n : null;
}
function initials(name) {
	return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "•";
}
//#endregion
export { toNumber as a, initials as i, formatDate as n, formatMoney as r, formatCompactDate as t };
