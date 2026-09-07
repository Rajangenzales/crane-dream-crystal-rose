import { o as __toESM } from "../_runtime.mjs";
import { i as initials } from "./format-BQrEX9ez.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { M as useAsync, b as listClients, g as getSessionWorkspace, i as createClient } from "./use-async-b-1li_WI.mjs";
import { t as Button } from "./button-DbJuaj1a.mjs";
import { s as Plus } from "../_libs/lucide-react.mjs";
import { t as Skeleton } from "./skeleton-C15JkHUK.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, r as DialogFooter, t as Dialog$1 } from "./dialog-BX6emVyv.mjs";
import { t as Input } from "./input-Ct-NdItt.mjs";
import { t as Label$1 } from "./label-lc6um11T.mjs";
import { n as Textarea, t as EmptyState } from "./empty-state-U_TrSS4a.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/clients-BxS3gKr8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ClientsPage() {
	const session = useAsync(() => getSessionWorkspace(), []);
	const { data, loading, error, reload } = useAsync(() => listClients({ data: { includeInactive: true } }), []);
	const [open, setOpen] = (0, import_react.useState)(false);
	const isAdmin = session.data?.profile.role === "admin";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Directory"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 font-display text-4xl",
					children: "Clients"
				})] }), isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "h-11",
					onClick: () => setOpen(true),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New client"]
				}) : null]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-destructive",
				children: error
			}) : null,
			loading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-32 rounded-2xl" }, i))
			}) : data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "No clients yet",
				body: "Add a client, assign services, then record the month's work in their workspace.",
				action: isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setOpen(true),
					children: "Add client"
				}) : null
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: data.map((client) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/clients/$clientId",
					params: { clientId: client.id },
					className: "flex gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/40",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid size-11 shrink-0 place-items-center rounded-xl bg-secondary font-display text-lg",
						children: initials(client.name)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate font-medium",
									children: client.name
								}), !client.isActive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted-foreground",
									children: "Archived"
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-0.5 block truncate text-sm text-muted-foreground",
								children: client.companyName || client.contactPerson
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-2 block text-xs text-muted-foreground",
								children: client.serviceNames.length ? client.serviceNames.join(" · ") : "No services assigned"
							})
						]
					})]
				}, client.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientForm, {
				open,
				onOpenChange: setOpen,
				onCreated: async () => {
					setOpen(false);
					reload();
				}
			})
		]
	});
}
function ClientForm({ open, onOpenChange, onCreated }) {
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		companyName: "",
		contactPerson: "",
		email: "",
		phone: "",
		notes: ""
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog$1, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "sm:max-w-lg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
				className: "font-display text-2xl",
				children: "New client"
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3",
				onSubmit: async (e) => {
					e.preventDefault();
					setBusy(true);
					try {
						await createClient({ data: form });
						toast.success("Client created");
						setForm({
							name: "",
							companyName: "",
							contactPerson: "",
							email: "",
							phone: "",
							notes: ""
						});
						onCreated();
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Could not create client");
					} finally {
						setBusy(false);
					}
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Client name",
						value: form.name,
						onChange: (name) => setForm({
							...form,
							name
						}),
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Company",
						value: form.companyName,
						onChange: (companyName) => setForm({
							...form,
							companyName
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Contact",
							value: form.contactPerson,
							onChange: (contactPerson) => setForm({
								...form,
								contactPerson
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Phone",
							value: form.phone,
							onChange: (phone) => setForm({
								...form,
								phone
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Email",
						value: form.email,
						onChange: (email) => setForm({
							...form,
							email
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: form.notes,
							onChange: (e) => setForm({
								...form,
								notes: e.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						onClick: () => onOpenChange(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy,
						children: busy ? "Saving…" : "Create"
					})] })
				]
			})]
		})
	});
}
function Field({ label, value, onChange, required }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			required,
			value,
			onChange: (e) => onChange(e.target.value)
		})]
	});
}
//#endregion
export { ClientsPage as component };
