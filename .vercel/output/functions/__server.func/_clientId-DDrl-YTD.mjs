import { o as __toESM } from "./_runtime.mjs";
import { a as monthTitle, i as currentPeriod, n as ACTIVITY_UNITS, r as PAYMENT_STATUSES, t as ACTIVITY_STATUSES } from "./_ssr/catalog-BTGOZ5oc.mjs";
import { r as formatMoney, t as formatCompactDate } from "./_ssr/format-BQrEX9ez.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { m as require_jsx_runtime } from "./_libs/@radix-ui/react-checkbox+[...].mjs";
import { D as unassignClientService, E as savePayment, M as useAsync, O as updateClient, T as saveActivity, _ as getWorkspace, c as deletePayment, g as getSessionWorkspace, l as deleteSection, n as assignClientService, s as deleteActivity, t as addSection, u as duplicatePeriod } from "./_ssr/use-async-b-1li_WI.mjs";
import { t as cva } from "./_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./_ssr/utils-DG8erAqy.mjs";
import { i as Trigger, n as List, r as Root2, t as Content } from "./_libs/radix-ui__react-tabs.mjs";
import { t as Button } from "./_ssr/button-DbJuaj1a.mjs";
import { S as ArrowLeft, a as Trash2, s as Plus } from "./_libs/lucide-react.mjs";
import { t as MonthPicker } from "./_ssr/month-picker-wOoMBOuV.mjs";
import { t as StatusBadge } from "./_ssr/status-badge-Cd2pWB4F.mjs";
import { t as Skeleton } from "./_ssr/skeleton-C15JkHUK.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { n as Route$1 } from "./_ssr/router-Dquu-Yyk.mjs";
import { a as DialogTitle, i as DialogHeader, n as DialogContent, r as DialogFooter, t as Dialog$1 } from "./_ssr/dialog-BX6emVyv.mjs";
import { t as Input } from "./_ssr/input-Ct-NdItt.mjs";
import { t as Label$1 } from "./_ssr/label-lc6um11T.mjs";
import { n as Textarea, t as EmptyState } from "./_ssr/empty-state-U_TrSS4a.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select$1 } from "./_ssr/select-C9u2hDP7.mjs";
import { t as Checkbox$1 } from "./_ssr/checkbox-bah1lD3s.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_clientId-DDrl-YTD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var emptyDraft = () => ({
	activityDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
	title: "",
	description: "",
	quantity: "",
	unit: "",
	status: "planned",
	notes: ""
});
function activityToDraft(activity) {
	return {
		activityDate: activity.activityDate ?? "",
		title: activity.title,
		description: activity.description,
		quantity: activity.quantity == null ? "" : String(activity.quantity),
		unit: activity.unit,
		status: activity.status,
		notes: activity.notes
	};
}
function ActivityDialog({ open, onOpenChange, title, initial, onSubmit, busy }) {
	const [draft, setDraft] = (0, import_react.useState)(emptyDraft());
	(0, import_react.useEffect)(() => {
		if (open) setDraft(initial ?? emptyDraft());
	}, [open, initial]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog$1, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-h-[90vh] overflow-y-auto sm:max-w-lg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
				className: "font-display text-2xl",
				children: title
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-4",
				onSubmit: (e) => {
					e.preventDefault();
					onSubmit(draft);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
							htmlFor: "act-title",
							children: "Title"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "act-title",
							required: true,
							value: draft.title,
							onChange: (e) => setDraft({
								...draft,
								title: e.target.value
							}),
							placeholder: "On-page optimisation"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
								htmlFor: "act-date",
								children: "Date"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "act-date",
								type: "date",
								value: draft.activityDate,
								onChange: (e) => setDraft({
									...draft,
									activityDate: e.target.value
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select$1, {
								value: draft.status,
								onValueChange: (status) => setDraft({
									...draft,
									status
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "w-full",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: ACTIVITY_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: s.value,
									children: s.label
								}, s.value)) })]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
								htmlFor: "act-qty",
								children: "Quantity"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "act-qty",
								inputMode: "decimal",
								value: draft.quantity,
								onChange: (e) => setDraft({
									...draft,
									quantity: e.target.value
								}),
								placeholder: "Optional"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Unit" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select$1, {
								value: draft.unit || "__none",
								onValueChange: (unit) => setDraft({
									...draft,
									unit: unit === "__none" ? "" : unit
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "w-full",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Optional" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "__none",
									children: "None"
								}), ACTIVITY_UNITS.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: u,
									children: u
								}, u))] })]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
							htmlFor: "act-desc",
							children: "Description"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							id: "act-desc",
							rows: 3,
							value: draft.description,
							onChange: (e) => setDraft({
								...draft,
								description: e.target.value
							}),
							placeholder: "What was done"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, {
							htmlFor: "act-notes",
							children: "Notes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							id: "act-notes",
							rows: 2,
							value: draft.notes,
							onChange: (e) => setDraft({
								...draft,
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
						children: busy ? "Saving…" : "Save activity"
					})] })
				]
			})]
		})
	});
}
function Tabs$1({ className, orientation = "horizontal", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root2, {
		"data-slot": "tabs",
		"data-orientation": orientation,
		orientation,
		className: cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className),
		...props
	});
}
var tabsListVariants = cva("group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none", {
	variants: { variant: {
		default: "bg-muted",
		line: "gap-1 bg-transparent"
	} },
	defaultVariants: { variant: "default" }
});
function TabsList({ className, variant = "default", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
		"data-slot": "tabs-list",
		"data-variant": variant,
		className: cn(tabsListVariants({ variant }), className),
		...props
	});
}
function TabsTrigger({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
		"data-slot": "tabs-trigger",
		className: cn("relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent", "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground", "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100", className),
		...props
	});
}
function TabsContent({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
		"data-slot": "tabs-content",
		className: cn("flex-1 outline-none", className),
		...props
	});
}
function ClientWorkspace() {
	const { clientId } = Route$1.useParams();
	const initial = currentPeriod();
	const [year, setYear] = (0, import_react.useState)(initial.year);
	const [month, setMonth] = (0, import_react.useState)(initial.month);
	const session = useAsync(() => getSessionWorkspace(), []);
	const { data, loading, error, reload } = useAsync(() => getWorkspace({ data: {
		clientId,
		year,
		month
	} }), [
		clientId,
		year,
		month
	]);
	const isAdmin = session.data?.profile.role === "admin";
	const currency = session.data?.settings.currency ?? "INR";
	if (loading && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-48" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-40 rounded-2xl" })]
	});
	if (error || !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-destructive",
		children: error ?? "Client not found."
	});
	const { client, period, sections, payments, services, assignedServiceIds } = data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/clients",
					className: "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), " Clients"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-4xl",
					children: client.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: [
						client.companyName,
						client.contactPerson,
						client.email,
						client.phone
					].filter(Boolean).join(" · ")
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonthPicker, {
					year,
					month,
					onChange: (y, m) => {
						setYear(y);
						setMonth(m);
					}
				}), isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DuplicateButton, {
					clientId: client.id,
					year,
					month,
					onDone: (y, m) => {
						setYear(y);
						setMonth(m);
						reload();
					}
				}) : null]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs$1, {
			defaultValue: "work",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
					className: "h-auto flex-wrap justify-start",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "overview",
							children: "Overview"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "work",
							children: "Monthly work"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "services",
							children: "Services"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "payments",
							children: "Payments"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "reports",
							children: "Reports"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
					value: "overview",
					className: "mt-5 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid gap-3 sm:grid-cols-3",
							children: sections.map((s) => {
								const done = s.activities.filter((a) => a.status === "completed" || a.status === "delivered").length;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-2xl border border-border bg-card p-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium",
										children: s.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm text-muted-foreground",
										children: [
											s.activities.length,
											" activities · ",
											done,
											" done"
										]
									})]
								}, s.id);
							})
						}),
						payments[0] ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-border bg-card p-4 text-sm",
							children: [
								"Payment · ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: payments[0].status }),
								" ",
								payments[0].amount != null ? formatMoney(payments[0].amount, currency) : ""
							]
						}) : null,
						isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientEditForm, {
							client,
							onSaved: reload
						}) : null
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
					value: "work",
					className: "mt-5 space-y-4",
					children: [
						sections.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
							title: `No sections in ${monthTitle(year, month)}`,
							body: "Assign services, or add a custom section for this month."
						}) : null,
						sections.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionCard, {
							section,
							isAdmin,
							onChanged: reload
						}, section.id)),
						isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddSection, {
							periodId: period.id,
							onAdded: reload
						}) : null
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "services",
					className: "mt-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServicesPanel, {
						isAdmin,
						services,
						assigned: assignedServiceIds,
						clientId: client.id,
						onChanged: reload
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "payments",
					className: "mt-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PaymentsPanel, {
						isAdmin,
						payments,
						clientId: client.id,
						periodId: period.id,
						year,
						month,
						currency,
						onChanged: reload
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "reports",
					className: "mt-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-border bg-card p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Generate from stored work — nothing to re-enter."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: `/print?kind=client&clientId=${client.id}&year=${year}&month=${month}`,
									target: "_blank",
									rel: "noreferrer",
									children: "Open client report"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/reports",
									children: "Combined & summaries"
								})
							})]
						})]
					})
				})
			]
		})]
	});
}
function SectionCard({ section, isAdmin, onChanged }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const qty = (0, import_react.useMemo)(() => {
		const byUnit = /* @__PURE__ */ new Map();
		for (const a of section.activities) if (a.quantity && a.unit) byUnit.set(a.unit, (byUnit.get(a.unit) ?? 0) + a.quantity);
		return [...byUnit.entries()].map(([u, n]) => `${n} ${u.toLowerCase()}`).join(" · ");
	}, [section.activities]);
	async function submit(draft) {
		setBusy(true);
		try {
			await saveActivity({ data: {
				id: editing?.id,
				sectionId: section.id,
				activityDate: draft.activityDate || null,
				title: draft.title,
				description: draft.description,
				quantity: draft.quantity ? Number(draft.quantity) : null,
				unit: draft.unit,
				status: draft.status,
				notes: draft.notes
			} });
			toast.success(editing ? "Activity updated" : "Activity added");
			setOpen(false);
			setEditing(null);
			onChanged();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not save");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-2xl border border-border bg-card p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: section.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: [
						section.activities.length,
						" activities",
						qty ? ` · ${qty}` : ""
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-2",
					children: isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: () => {
							setEditing(null);
							setOpen(true);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), " Add activity"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon-sm",
						variant: "ghost",
						"aria-label": "Delete section",
						onClick: async () => {
							if (!confirm(`Remove ${section.title} from this month? Activities under it will be deleted.`)) return;
							await deleteSection({ data: { id: section.id } });
							toast.success("Section removed");
							onChanged();
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
					})] }) : null
				})]
			}),
			section.activities.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-muted-foreground",
				children: "No activities yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 divide-y divide-border",
				children: section.activities.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-start justify-between gap-3 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs tabular-nums text-muted-foreground",
									children: formatCompactDate(a.activityDate)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium",
									children: a.title
								}),
								a.quantity != null && a.unit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs text-muted-foreground",
									children: [
										a.quantity,
										" ",
										a.unit.toLowerCase()
									]
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: a.status })
							]
						}), a.description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted-foreground",
							children: a.description
						}) : null]
					}), isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => {
								setEditing(a);
								setOpen(true);
							},
							children: "Edit"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon-sm",
							variant: "ghost",
							"aria-label": "Delete activity",
							onClick: async () => {
								await deleteActivity({ data: { id: a.id } });
								toast.success("Deleted");
								onChanged();
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
						})]
					}) : null]
				}, a.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityDialog, {
				open,
				onOpenChange: setOpen,
				title: editing ? "Edit activity" : `Add activity · ${section.title}`,
				initial: editing ? activityToDraft(editing) : null,
				onSubmit: submit,
				busy
			})
		]
	});
}
function AddSection({ periodId, onAdded }) {
	const [title, setTitle] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "flex flex-col gap-2 sm:flex-row",
		onSubmit: async (e) => {
			e.preventDefault();
			if (!title.trim()) return;
			await addSection({ data: {
				periodId,
				title
			} });
			setTitle("");
			toast.success("Section added");
			onAdded();
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			value: title,
			onChange: (e) => setTitle(e.target.value),
			placeholder: "Custom section name",
			className: "sm:max-w-xs"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "submit",
			variant: "outline",
			children: "Add section"
		})]
	});
}
function ServicesPanel({ isAdmin, services, assigned, clientId, onChanged }) {
	const [custom, setCustom] = (0, import_react.useState)("");
	const [promote, setPromote] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 rounded-2xl border border-border bg-card p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Assigned services seed each new month. Removing one here does not delete historical monthly sections."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: services.filter((s) => s.isActive || assigned.includes(s.id)).map((s) => {
					const on = assigned.includes(s.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
							checked: on,
							disabled: !isAdmin,
							onCheckedChange: async (checked) => {
								if (checked) await assignClientService({ data: {
									clientId,
									serviceId: s.id
								} });
								else await unassignClientService({ data: {
									clientId,
									serviceId: s.id
								} });
								onChanged();
							}
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: s.name })]
					}, s.id);
				})
			}),
			isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center",
				onSubmit: async (e) => {
					e.preventDefault();
					if (!custom.trim()) return;
					await assignClientService({ data: {
						clientId,
						customName: custom,
						promote
					} });
					setCustom("");
					toast.success("Custom service assigned");
					onChanged();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: custom,
						onChange: (e) => setCustom(e.target.value),
						placeholder: "Client-only custom service"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-2 text-sm text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
							checked: promote,
							onCheckedChange: (v) => setPromote(Boolean(v))
						}), "Add to library"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "outline",
						children: "Add"
					})
				]
			}) : null
		]
	});
}
function PaymentsPanel({ isAdmin, payments, clientId, periodId, year, month, currency, onChanged }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [payments.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
			title: "No payment recorded",
			body: "Payments live independently of report generation."
		}) : payments.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { value: p.status }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-display text-2xl tabular-nums",
					children: formatMoney(p.amount, currency)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: p.notes
				})
			] }), isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				onClick: async () => {
					await deletePayment({ data: { id: p.id } });
					onChanged();
				},
				children: "Remove"
			}) : null]
		}, p.id)), isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			onClick: () => setOpen(true),
			children: "Record payment"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PaymentDialog, {
			open,
			onOpenChange: setOpen,
			onSubmit: async (form) => {
				await savePayment({ data: {
					clientId,
					periodId,
					year,
					month,
					status: form.status,
					amount: form.amount ? Number(form.amount) : null,
					paymentDate: form.paymentDate || null,
					notes: form.notes
				} });
				setOpen(false);
				toast.success("Payment saved");
				onChanged();
			}
		})] }) : null]
	});
}
function PaymentDialog({ open, onOpenChange, onSubmit }) {
	const [form, setForm] = (0, import_react.useState)({
		status: "pending",
		amount: "",
		paymentDate: "",
		notes: ""
	});
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog$1, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
			className: "font-display text-2xl",
			children: "Payment"
		}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "grid gap-3",
			onSubmit: async (e) => {
				e.preventDefault();
				setBusy(true);
				try {
					await onSubmit(form);
				} finally {
					setBusy(false);
				}
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select$1, {
					value: form.status,
					onValueChange: (status) => setForm({
						...form,
						status
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
						className: "w-full",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: PAYMENT_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: s.value,
						children: s.label
					}, s.value)) })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Amount" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					inputMode: "decimal",
					value: form.amount,
					onChange: (e) => setForm({
						...form,
						amount: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Date" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "date",
					value: form.paymentDate,
					onChange: (e) => setForm({
						...form,
						paymentDate: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label$1, { children: "Notes" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: form.notes,
					onChange: (e) => setForm({
						...form,
						notes: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: busy,
					children: "Save"
				}) })
			]
		})] })
	});
}
function ClientEditForm({ client, onSaved }) {
	const [form, setForm] = (0, import_react.useState)(client);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2",
		onSubmit: async (e) => {
			e.preventDefault();
			await updateClient({ data: {
				id: client.id,
				name: form.name,
				companyName: form.companyName,
				contactPerson: form.contactPerson,
				email: form.email,
				phone: form.phone,
				notes: form.notes,
				isActive: form.isActive
			} });
			toast.success("Client updated");
			onSaved();
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-display text-xl sm:col-span-2",
				children: "Client details"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: form.name,
				onChange: (e) => setForm({
					...form,
					name: e.target.value
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: form.companyName,
				onChange: (e) => setForm({
					...form,
					companyName: e.target.value
				}),
				placeholder: "Company"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: form.contactPerson,
				onChange: (e) => setForm({
					...form,
					contactPerson: e.target.value
				}),
				placeholder: "Contact"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: form.phone,
				onChange: (e) => setForm({
					...form,
					phone: e.target.value
				}),
				placeholder: "Phone"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: form.email,
				onChange: (e) => setForm({
					...form,
					email: e.target.value
				}),
				placeholder: "Email",
				className: "sm:col-span-2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				value: form.notes,
				onChange: (e) => setForm({
					...form,
					notes: e.target.value
				}),
				className: "sm:col-span-2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
					checked: form.isActive,
					onCheckedChange: (v) => setForm({
						...form,
						isActive: Boolean(v)
					})
				}), "Active"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				className: "sm:justify-self-end",
				children: "Save details"
			})
		]
	});
}
function DuplicateButton({ clientId, year, month, onDone }) {
	const prev = new Date(year, month - 2, 1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		variant: "outline",
		onClick: async () => {
			await duplicatePeriod({ data: {
				clientId,
				fromYear: prev.getFullYear(),
				fromMonth: prev.getMonth() + 1,
				toYear: year,
				toMonth: month
			} });
			toast.success(`Copied structure from ${monthTitle(prev.getFullYear(), prev.getMonth() + 1)}`);
			onDone(year, month);
		},
		children: "Duplicate previous month"
	});
}
//#endregion
export { ClientWorkspace as component };
