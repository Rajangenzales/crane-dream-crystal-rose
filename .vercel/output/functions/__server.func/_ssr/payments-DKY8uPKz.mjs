import { o as __toESM } from "../_runtime.mjs";
import { a as monthTitle, i as currentPeriod } from "./catalog-BTGOZ5oc.mjs";
import { n as formatDate, r as formatMoney } from "./format-BQrEX9ez.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { M as useAsync, g as getSessionWorkspace, x as listPayments } from "./use-async-b-1li_WI.mjs";
import { t as MonthPicker } from "./month-picker-wOoMBOuV.mjs";
import { t as StatusBadge } from "./status-badge-Cd2pWB4F.mjs";
import { t as Skeleton } from "./skeleton-C15JkHUK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/payments-DKY8uPKz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PaymentsPage() {
	const initial = currentPeriod();
	const [year, setYear] = (0, import_react.useState)(initial.year);
	const [month, setMonth] = (0, import_react.useState)(initial.month);
	const session = useAsync(() => getSessionWorkspace(), []);
	const { data, loading, error } = useAsync(() => listPayments({ data: {
		year,
		month
	} }), [year, month]);
	const currency = session.data?.settings.currency ?? "INR";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
						children: "Ledger"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-1 font-display text-4xl",
						children: "Payments"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: monthTitle(year, month)
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonthPicker, {
					year,
					month,
					onChange: (y, m) => {
						setYear(y);
						setMonth(m);
					}
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-destructive",
				children: error
			}) : null,
			loading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-64 rounded-2xl" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden rounded-2xl border border-border bg-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-border",
					children: data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "px-5 py-8 text-sm text-muted-foreground",
						children: "No payments recorded this month."
					}) : data.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							className: "font-medium hover:underline",
							to: "/clients/$clientId",
							params: { clientId: p.clientId },
							children: p.clientName ?? "Client"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: formatDate(p.paymentDate)
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: p.status }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tabular-nums text-sm",
								children: formatMoney(p.amount, currency)
							})]
						})]
					}, p.id))
				})
			})
		]
	});
}
//#endregion
export { PaymentsPage as component };
