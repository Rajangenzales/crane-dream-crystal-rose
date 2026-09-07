import { o as __toESM } from "../_runtime.mjs";
import { n as formatDate } from "./format-BQrEX9ez.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { A as updateSettings, M as useAsync, g as getSessionWorkspace, r as createBackup, v as listAudit, w as restoreBackup, y as listBackups } from "./use-async-b-1li_WI.mjs";
import { t as Button } from "./button-DbJuaj1a.mjs";
import { t as Skeleton } from "./skeleton-C15JkHUK.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-Ct-NdItt.mjs";
import { t as Label$1 } from "./label-lc6um11T.mjs";
import { t as Switch$1 } from "./switch-BNb4olDd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-C9Nx0nH-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SettingsPage() {
	const session = useAsync(() => getSessionWorkspace(), []);
	const backups = useAsync(() => listBackups(), []);
	const audit = useAsync(() => listAudit(), []);
	const [form, setForm] = (0, import_react.useState)({
		agencyName: "",
		agencyTagline: "",
		currency: "INR",
		viewersSeePayments: true
	});
	(0, import_react.useEffect)(() => {
		if (session.data) setForm({
			agencyName: session.data.settings.agencyName,
			agencyTagline: session.data.settings.agencyTagline,
			currency: session.data.settings.currency,
			viewersSeePayments: session.data.settings.viewersSeePayments
		});
	}, [session.data]);
	if (session.data && session.data.profile.role !== "admin") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: "Only administrators can change settings."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
				children: "Studio"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-1 font-display text-4xl",
				children: "Settings"
			})] }),
			session.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-48 rounded-2xl" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid max-w-lg gap-3 rounded-2xl border border-border bg-card p-5",
				onSubmit: async (e) => {
					e.preventDefault();
					await updateSettings({ data: form });
					toast.success("Settings saved");
					session.reload();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Agency name" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: form.agencyName,
						onChange: (e) => setForm({
							...form,
							agencyName: e.target.value
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Tagline" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: form.agencyTagline,
						onChange: (e) => setForm({
							...form,
							agencyTagline: e.target.value
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Currency" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: form.currency,
						onChange: (e) => setForm({
							...form,
							currency: e.target.value.toUpperCase()
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center justify-between gap-3 text-sm",
						children: ["Viewers can see payment amounts", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
							checked: form.viewersSeePayments,
							onCheckedChange: (viewersSeePayments) => setForm({
								...form,
								viewersSeePayments
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "mt-2 w-fit",
						children: "Save"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl",
						children: "Backups"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Snapshots of work data. Restore creates a safety copy first."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: async () => {
								const result = await createBackup({ data: { note: "Manual backup" } });
								const blob = new Blob([result.payloadJson], { type: "application/json" });
								const url = URL.createObjectURL(blob);
								const a = document.createElement("a");
								a.href = url;
								a.download = `monthly-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
								a.click();
								URL.revokeObjectURL(url);
								toast.success("Backup created");
								backups.reload();
							},
							children: "Backup now"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "inline-flex h-9 cursor-pointer items-center rounded-md border border-input px-3 text-sm",
							children: ["Restore from file", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: "application/json",
								className: "hidden",
								onChange: async (e) => {
									const file = e.target.files?.[0];
									if (!file) return;
									const text = await file.text();
									await restoreBackup({ data: { payload: JSON.parse(text) } });
									toast.success("Backup restored");
									backups.reload();
									session.reload();
								}
							})]
						})]
					}),
					backups.data?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
						children: backups.data.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between gap-3 px-5 py-3 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								b.note,
								" · ",
								formatDate(b.createdAt.slice(0, 10))
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: async () => {
									if (!confirm("Restore this backup? A safety copy of the current data will be kept.")) return;
									await restoreBackup({ data: { id: b.id } });
									toast.success("Restored");
									session.reload();
								},
								children: "Restore"
							})]
						}, b.id))
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Audit"
				}), audit.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-40 rounded-2xl" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card text-sm",
					children: (audit.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "px-5 py-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: row.action
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground",
							children: [
								" ",
								"· ",
								row.entityType,
								" ",
								row.detail,
								" · ",
								formatDate(row.createdAt.slice(0, 10))
							]
						})]
					}, row.id))
				})]
			})
		]
	});
}
//#endregion
export { SettingsPage as component };
