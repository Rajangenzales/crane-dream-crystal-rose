import { a as monthTitle } from "./catalog-BTGOZ5oc.mjs";
import { m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { t as Button } from "./button-DbJuaj1a.mjs";
import { _ as ChevronLeft, g as ChevronRight } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/month-picker-wOoMBOuV.js
var import_jsx_runtime = require_jsx_runtime();
function MonthPicker({ year, month, onChange }) {
	function shift(delta) {
		const date = new Date(year, month - 1 + delta, 1);
		onChange(date.getFullYear(), date.getMonth() + 1);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-1 rounded-full border border-border bg-card p-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				size: "icon-sm",
				className: "rounded-full",
				onClick: () => shift(-1),
				"aria-label": "Previous month",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-w-36 px-2 text-center text-sm font-medium tabular-nums",
				children: monthTitle(year, month)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				size: "icon-sm",
				className: "rounded-full",
				onClick: () => shift(1),
				"aria-label": "Next month",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {})
			})
		]
	});
}
//#endregion
export { MonthPicker as t };
