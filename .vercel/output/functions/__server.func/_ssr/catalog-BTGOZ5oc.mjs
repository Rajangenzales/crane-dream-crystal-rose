//#region node_modules/.nitro/vite/services/ssr/assets/catalog-BTGOZ5oc.js
var ACTIVITY_STATUSES = [
	{
		value: "planned",
		label: "Planned"
	},
	{
		value: "in_progress",
		label: "In Progress"
	},
	{
		value: "ongoing",
		label: "Ongoing"
	},
	{
		value: "delivered",
		label: "Delivered"
	},
	{
		value: "completed",
		label: "Completed"
	},
	{
		value: "not_applicable",
		label: "Not Applicable"
	}
];
var ACTIVITY_UNITS = [
	"Creatives",
	"Posters",
	"Videos",
	"Animations",
	"Pages",
	"Campaigns",
	"Articles",
	"Logos",
	"Boards",
	"Hours",
	"Tasks",
	"Projects",
	"Posts",
	"Custom"
];
var PAYMENT_STATUSES = [
	{
		value: "not_applicable",
		label: "Not Applicable"
	},
	{
		value: "pending",
		label: "Pending"
	},
	{
		value: "received",
		label: "Received"
	}
];
var MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];
function monthTitle(year, month) {
	return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}
function statusLabel(value) {
	return ACTIVITY_STATUSES.find((s) => s.value === value)?.label ?? PAYMENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}
function currentPeriod(now = /* @__PURE__ */ new Date()) {
	return {
		year: now.getFullYear(),
		month: now.getMonth() + 1
	};
}
//#endregion
export { monthTitle as a, currentPeriod as i, ACTIVITY_UNITS as n, statusLabel as o, PAYMENT_STATUSES as r, ACTIVITY_STATUSES as t };
