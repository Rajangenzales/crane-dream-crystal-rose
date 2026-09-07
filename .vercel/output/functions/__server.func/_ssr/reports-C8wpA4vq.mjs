import { o as __toESM } from "../_runtime.mjs";
import { a as monthTitle, i as currentPeriod } from "./catalog-BTGOZ5oc.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { M as useAsync, b as listClients } from "./use-async-b-1li_WI.mjs";
import { t as Button } from "./button-DbJuaj1a.mjs";
import { t as MonthPicker } from "./month-picker-wOoMBOuV.mjs";
import { t as Skeleton } from "./skeleton-C15JkHUK.mjs";
import { t as Checkbox$1 } from "./checkbox-bah1lD3s.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-C8wpA4vq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ReportsPage() {
	const initial = currentPeriod();
	const [year, setYear] = (0, import_react.useState)(initial.year);
	const [month, setMonth] = (0, import_react.useState)(initial.month);
	const { data, loading } = useAsync(() => listClients({ data: {} }), []);
	const [selected, setSelected] = (0, import_react.useState)([]);
	const ids = (0, import_react.useMemo)(() => selected.join(","), [selected]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
						children: "Output"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-1 font-display text-4xl",
						children: "Reports"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xl text-sm text-muted-foreground",
						children: "Generated from stored work. Open a document, then use Print to save a PDF."
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportCard, {
					title: "Monthly summary",
					body: `Studio-wide view of ${monthTitle(year, month)}.`,
					href: `/print?kind=month&year=${year}&month=${month}`
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportCard, {
					title: "Founder summary",
					body: "Active clients, quantities, outstanding payments, and gaps.",
					href: `/print?kind=founder&year=${year}&month=${month}`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl border border-border bg-card p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "Combined client report"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: "Select clients to bind into one printable document."
					}),
					loading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mt-4 h-40" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 grid gap-2 sm:grid-cols-2",
						children: data.map((c) => {
							const on = selected.includes(c.id);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-secondary/60",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
									checked: on,
									onCheckedChange: (checked) => {
										setSelected((prev) => checked ? [...prev, c.id] : prev.filter((id) => id !== c.id));
									}
								}), c.name]
							}) }, c.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							disabled: !selected.length,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: `/print?kind=combined&year=${year}&month=${month}&ids=${ids}`,
								target: "_blank",
								rel: "noreferrer",
								children: "Open combined report"
							})
						})
					})
				]
			})
		]
	});
}
function ReportCard({ title, body, href }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: body
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-4",
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href,
					target: "_blank",
					rel: "noreferrer",
					children: "Open"
				})
			})
		]
	});
}
//#endregion
export { ReportsPage as component };
