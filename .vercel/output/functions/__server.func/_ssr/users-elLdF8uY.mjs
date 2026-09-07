import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { C as listUsers, M as useAsync, a as createEmailUser, g as getSessionWorkspace, j as updateUserAccess } from "./use-async-b-1li_WI.mjs";
import { t as Button } from "./button-DbJuaj1a.mjs";
import { t as StatusBadge } from "./status-badge-Cd2pWB4F.mjs";
import { t as Skeleton } from "./skeleton-C15JkHUK.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, r as DialogFooter, t as Dialog$1 } from "./dialog-BX6emVyv.mjs";
import { t as Input } from "./input-Ct-NdItt.mjs";
import { t as Label$1 } from "./label-lc6um11T.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select$1 } from "./select-C9u2hDP7.mjs";
import { t as Switch$1 } from "./switch-BNb4olDd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/users-elLdF8uY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function UsersPage() {
	const session = useAsync(() => getSessionWorkspace(), []);
	const { data, loading, error, reload } = useAsync(() => listUsers(), []);
	const [open, setOpen] = (0, import_react.useState)(false);
	if (session.data && session.data.profile.role !== "admin") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: "Only administrators can manage users."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Access"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 font-display text-4xl",
					children: "Users"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: () => setOpen(true),
					children: "New user"
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-destructive",
				children: error
			}) : null,
			loading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-64 rounded-2xl" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
				children: data.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: u.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: u.email
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select$1, {
							value: u.role,
							onValueChange: async (role) => {
								await updateUserAccess({ data: {
									userId: u.userId,
									role
								} });
								reload();
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-32",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "admin",
								children: "Admin"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "viewer",
								children: "Viewer"
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [u.isActive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: "completed" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: "pending" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
								checked: u.isActive,
								onCheckedChange: async (isActive) => {
									try {
										await updateUserAccess({ data: {
											userId: u.userId,
											isActive
										} });
										reload();
									} catch (err) {
										toast.error(err instanceof Error ? err.message : "Could not update");
									}
								}
							})]
						})]
					})]
				}, u.userId))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewUserDialog, {
				open,
				onOpenChange: setOpen,
				onCreated: () => {
					setOpen(false);
					reload();
				}
			})
		]
	});
}
function NewUserDialog({ open, onOpenChange, onCreated }) {
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		email: "",
		password: "",
		role: "viewer"
	});
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog$1, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
			className: "font-display text-2xl",
			children: "Create user"
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "grid gap-3",
			onSubmit: async (e) => {
				e.preventDefault();
				setBusy(true);
				try {
					await createEmailUser({ data: form });
					toast.success("User created");
					setForm({
						name: "",
						email: "",
						password: "",
						role: "viewer"
					});
					onCreated();
				} catch (err) {
					toast.error(err instanceof Error ? err.message : "Could not create user");
				} finally {
					setBusy(false);
				}
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Name" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					required: true,
					value: form.name,
					onChange: (e) => setForm({
						...form,
						name: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Email" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					required: true,
					type: "email",
					value: form.email,
					onChange: (e) => setForm({
						...form,
						email: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Password" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					required: true,
					type: "password",
					minLength: 8,
					value: form.password,
					onChange: (e) => setForm({
						...form,
						password: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Role" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select$1, {
					value: form.role,
					onValueChange: (role) => setForm({
						...form,
						role
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: "admin",
						children: "Admin"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: "viewer",
						children: "Viewer"
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: busy,
					children: busy ? "Creating…" : "Create"
				}) })
			]
		})] })
	});
}
//#endregion
export { UsersPage as component };
