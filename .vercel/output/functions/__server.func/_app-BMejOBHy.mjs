import { o as __toESM } from "./_runtime.mjs";
import { a as monthTitle, i as currentPeriod } from "./_ssr/catalog-BTGOZ5oc.mjs";
import { r as formatMoney } from "./_ssr/format-BQrEX9ez.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { m as require_jsx_runtime } from "./_libs/@radix-ui/react-checkbox+[...].mjs";
import { M as useAsync, g as getSessionWorkspace, p as getDashboard } from "./_ssr/use-async-b-1li_WI.mjs";
import { t as MonthPicker } from "./_ssr/month-picker-wOoMBOuV.mjs";
import { t as StatusBadge } from "./_ssr/status-badge-Cd2pWB4F.mjs";
import { t as Skeleton } from "./_ssr/skeleton-C15JkHUK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app-BMejOBHy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DashboardPage() {
	const initial = currentPeriod();
	const [year, setYear] = (0, import_react.useState)(initial.year);
	const [month, setMonth] = (0, import_react.useState)(initial.month);
	const session = useAsync(() => getSessionWorkspace(), []);
	const { data, loading, error } = useAsync(() => getDashboard({ data: {
		year,
		month
	} }), [year, month]);
	const currency = session.data?.settings.currency ?? "INR";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Overview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 font-display text-4xl",
					children: monthTitle(year, month)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonthPicker, {
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
			loading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-4",
				children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-24 rounded-2xl" }, i))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Active clients",
						value: String(data.activeClients)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "With work",
						value: String(data.clientsThisMonth)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Activities",
						value: String(data.totalActivities),
						hint: `${data.completedActivities} completed`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Received",
						value: formatMoney(data.paymentsReceived, currency),
						hint: `Pending ${formatMoney(data.paymentsPending, currency)}`
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "overflow-hidden rounded-2xl border border-border bg-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-5 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "This month"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/clients",
						className: "text-sm text-muted-foreground hover:text-foreground",
						children: "All clients"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-border",
					children: data.clientRows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "px-5 py-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/clients/$clientId",
										params: { clientId: row.client.id },
										className: "font-medium hover:underline",
										children: row.client.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: row.client.companyName
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-sm text-muted-foreground",
										children: row.workSummary
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex shrink-0 flex-col items-end gap-1 text-right",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs tabular-nums text-muted-foreground",
										children: [
											row.completedCount,
											"/",
											row.activityCount,
											" done"
										]
									}),
									row.paymentStatus !== "—" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: row.paymentStatus }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "—"
									}),
									row.paymentAmount != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: formatMoney(row.paymentAmount, currency)
									}) : null
								]
							})]
						})
					}, row.client.id))
				})]
			})] })
		]
	});
}
function Stat({ label, value, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card px-4 py-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-display text-3xl tabular-nums leading-none",
				children: value
			}),
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted-foreground",
				children: hint
			}) : null
		]
	});
}
//#endregion
export { DashboardPage as component };
