import { o as __toESM } from "../_runtime.mjs";
import { a as monthTitle, o as statusLabel } from "./catalog-BTGOZ5oc.mjs";
import { n as formatDate, r as formatMoney } from "./format-BQrEX9ez.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { M as useAsync, d as getClientReport, f as getCombinedReport, g as getSessionWorkspace, h as getMonthSummary, m as getFounderSummary } from "./use-async-b-1li_WI.mjs";
import { t as Button } from "./button-DbJuaj1a.mjs";
import { n as useCurrentUserState } from "./use-current-user-DG6UNzh9.mjs";
import { t as RedirectToSignIn } from "./gates-UEWeaJMG.mjs";
import { r as Route$10 } from "./router-Dquu-Yyk.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/print-BSSChD7E.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Letterhead({ settings, kicker }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex items-end justify-between border-b border-border pb-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase",
				children: settings.agencyName
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-1 font-display text-3xl text-foreground",
				children: kicker
			}),
			settings.agencyTagline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: settings.agencyTagline
			}) : null
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-right text-sm text-muted-foreground",
			children: "Monthly report"
		})]
	});
}
function ClientReportDoc({ report }) {
	const { client, period, sections, payments, settings } = report;
	const worked = sections.filter((s) => s.activities.length > 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-3xl bg-card px-8 py-10 text-card-foreground print:max-w-none print:px-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Letterhead, {
				settings,
				kicker: monthTitle(period.year, period.month)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: client.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: [
						client.companyName,
						client.contactPerson,
						client.email
					].filter(Boolean).join(" · ")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Services worked on"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-6",
					children: [worked.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "No activities recorded this month."
					}) : null, worked.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "font-medium",
						children: section.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 space-y-1.5",
						children: section.activities.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex flex-wrap items-baseline gap-x-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground tabular-nums",
									children: formatDate(a.activityDate)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: a.title }),
								a.quantity != null && a.unit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted-foreground",
									children: [
										"· ",
										a.quantity,
										" ",
										a.unit.toLowerCase()
									]
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted-foreground",
									children: ["· ", statusLabel(a.status)]
								}),
								a.description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "w-full pl-0 text-muted-foreground",
									children: a.description
								}) : null
							]
						}, a.id))
					})] }, section.id))]
				})]
			}),
			payments.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8 border-t border-border pt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Payment"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-1 text-sm",
					children: payments.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Status: ",
						statusLabel(p.status),
						p.amount != null ? ` · ${formatMoney(p.amount, settings.currency)}` : "",
						p.paymentDate ? ` · ${formatDate(p.paymentDate)}` : "",
						p.notes ? ` · ${p.notes}` : ""
					] }, p.id))
				})]
			}) : null
		]
	});
}
function CombinedReportDoc({ reports, settings, year, month }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-10",
		children: [reports.map((report, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: i < reports.length - 1 ? "print-page" : "",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientReportDoc, { report: {
				...report,
				settings
			} })
		}, report.client.id)), reports.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "mx-auto max-w-3xl bg-card px-8 py-10",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Letterhead, {
				settings,
				kicker: monthTitle(year, month)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-sm text-muted-foreground",
				children: "No clients selected."
			})]
		}) : null]
	});
}
function MonthSummaryDoc({ summary, settings }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-3xl bg-card px-8 py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Letterhead, {
				settings,
				kicker: `${monthTitle(summary.year, summary.month)} summary`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Clients served",
						value: String(summary.clientsServed)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Activities",
						value: String(summary.totalActivities)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Received",
						value: formatMoney(summary.paymentsReceived, settings.currency)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Pending",
						value: formatMoney(summary.paymentsPending, settings.currency)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "mt-8 w-full text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-border text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3 font-medium",
							children: "Client"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3 font-medium",
							children: "Work done"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 text-right font-medium",
							children: "Total"
						})
					]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: summary.rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-border/70",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2.5 pr-3 align-top font-medium",
							children: row.client.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2.5 pr-3 align-top text-muted-foreground",
							children: row.workDone
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2.5 text-right align-top tabular-nums",
							children: row.totalWork
						})
					]
				}, row.client.id)) })]
			})
		]
	});
}
function FounderSummaryDoc({ summary, settings }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-3xl bg-card px-8 py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Letterhead, {
				settings,
				kicker: `${monthTitle(summary.year, summary.month)} · Founder`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Active clients",
						value: String(summary.activeClients)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "With work",
						value: String(summary.clientsServed)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Activities",
						value: String(summary.totalActivities)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Received",
						value: formatMoney(summary.paymentsReceived, settings.currency)
					})
				]
			}),
			summary.units.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Quantities"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-wrap gap-2",
					children: summary.units.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-full bg-secondary px-3 py-1 text-sm",
						children: [
							u.quantity,
							" ",
							u.unit.toLowerCase()
						]
					}, u.unit))
				})]
			}) : null,
			summary.services.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Service mix"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-1 text-sm",
					children: summary.services.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						s.name,
						" · ",
						s.sections,
						" client",
						s.sections === 1 ? "" : "s"
					] }, s.name))
				})]
			}) : null,
			summary.clientsWithNoWork.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "No recorded work"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: summary.clientsWithNoWork.map((c) => c.name).join(", ")
				})]
			}) : null,
			summary.clientsWithOutstanding.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
					children: "Outstanding payments"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-2 space-y-1 text-sm",
					children: summary.clientsWithOutstanding.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [c.name, c.amount != null ? ` · ${formatMoney(c.amount, settings.currency)}` : ""] }, c.id))
				})]
			}) : null
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-secondary/70 px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "mt-1 font-display text-2xl tabular-nums",
			children: value
		})]
	});
}
function PrintPage() {
	const { user, isPending } = useCurrentUserState();
	const search = Route$10.useSearch();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-h-svh bg-background" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrintBody, { search });
}
function PrintBody({ search }) {
	const session = useAsync(() => getSessionWorkspace(), []);
	const settings = session.data?.settings;
	const clientIds = (0, import_react.useMemo)(() => search.ids ? search.ids.split(",").filter(Boolean) : [], [search.ids]);
	const client = useAsync(() => search.kind === "client" && search.clientId ? getClientReport({ data: {
		clientId: search.clientId,
		year: search.year,
		month: search.month
	} }) : Promise.resolve(null), [
		search.kind,
		search.clientId,
		search.year,
		search.month
	]);
	const combined = useAsync(() => search.kind === "combined" ? getCombinedReport({ data: {
		clientIds,
		year: search.year,
		month: search.month
	} }) : Promise.resolve(null), [
		search.kind,
		clientIds.join(","),
		search.year,
		search.month
	]);
	const month = useAsync(() => search.kind === "month" ? getMonthSummary({ data: {
		year: search.year,
		month: search.month
	} }) : Promise.resolve(null), [
		search.kind,
		search.year,
		search.month
	]);
	const founder = useAsync(() => search.kind === "founder" ? getFounderSummary({ data: {
		year: search.year,
		month: search.month
	} }) : Promise.resolve(null), [
		search.kind,
		search.year,
		search.month
	]);
	const loading = client.loading || combined.loading || month.loading || founder.loading || session.loading;
	const err = client.error || combined.error || month.error || founder.error;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-svh bg-background pb-16",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted-foreground",
				children: [
					monthTitle(search.year, search.month),
					" · ",
					search.kind,
					" report"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => window.print(),
				children: "Print / Save PDF"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-3 py-6 sm:px-6",
			children: [
				err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto max-w-3xl text-sm text-destructive",
					children: err
				}) : null,
				loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto max-w-3xl text-sm text-muted-foreground",
					children: "Preparing report…"
				}) : null,
				search.kind === "client" && client.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClientReportDoc, { report: client.data }) : null,
				search.kind === "combined" && combined.data && settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CombinedReportDoc, {
					reports: combined.data.reports,
					settings: combined.data.settings,
					year: search.year,
					month: search.month
				}) : null,
				search.kind === "month" && month.data && settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonthSummaryDoc, {
					summary: month.data,
					settings
				}) : null,
				search.kind === "founder" && founder.data && settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FounderSummaryDoc, {
					summary: founder.data,
					settings
				}) : null
			]
		})]
	});
}
//#endregion
export { PrintPage as component };
