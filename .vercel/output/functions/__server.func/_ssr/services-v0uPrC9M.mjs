import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { M as useAsync, S as listServices, g as getSessionWorkspace, k as updateService, o as createService } from "./use-async-b-1li_WI.mjs";
import { t as Button } from "./button-DbJuaj1a.mjs";
import { t as Skeleton } from "./skeleton-C15JkHUK.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-Ct-NdItt.mjs";
import { t as Switch$1 } from "./switch-BNb4olDd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/services-v0uPrC9M.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ServicesPage() {
	const session = useAsync(() => getSessionWorkspace(), []);
	const { data, loading, error, reload } = useAsync(() => listServices({ data: { includeInactive: true } }), []);
	const isAdmin = session.data?.profile.role === "admin";
	const [name, setName] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Catalogue"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 font-display text-4xl",
					children: "Service library"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-xl text-sm text-muted-foreground",
					children: "Global services offered by the studio. Deactivating a service keeps historical monthly sections intact."
				})
			] }),
			isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex max-w-lg gap-2",
				onSubmit: async (e) => {
					e.preventDefault();
					try {
						await createService({ data: {
							name,
							isGlobal: true
						} });
						setName("");
						toast.success("Service added");
						reload();
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Could not add");
					}
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: name,
					onChange: (e) => setName(e.target.value),
					placeholder: "New service name"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					children: "Add"
				})]
			}) : null,
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-destructive",
				children: error
			}) : null,
			loading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-64 rounded-2xl" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
				children: data.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between gap-3 px-5 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: s.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: s.isGlobal ? "Library" : "Custom"
					})] }), isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-2 text-sm text-muted-foreground",
						children: ["Active", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
							checked: s.isActive,
							onCheckedChange: async (isActive) => {
								await updateService({ data: {
									id: s.id,
									name: s.name,
									isActive
								} });
								reload();
							}
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-muted-foreground",
						children: s.isActive ? "Active" : "Inactive"
					})]
				}, s.id))
			})
		]
	});
}
//#endregion
export { ServicesPage as component };
