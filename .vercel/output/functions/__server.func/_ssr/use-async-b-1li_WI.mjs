import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-CPfEg9sn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-async-b-1li_WI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getSessionWorkspace = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("3b6094447d441454318dc09e7abfc36c0309e02b60a73a7a3604861c2ac64bf2"));
var updateSettings = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("473443b0129b25e1479f36f6527e528533429f640b8a104863697172c5d392df"));
var listClients = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d ?? {}).handler(createSsrRpc("ff88e4208d74c8d6e8f24c59d7a770c05fc331196e753cb0b233f3829c8ecf31"));
var createClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("7eb023852fe655719f65fceab286b3c33f755b7831756abde5380ff497030630"));
var updateClient = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("16d0652b21505f905a250f189c1787acc46803261cac180f2ebe88af0c53e09f"));
var listServices = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d ?? {}).handler(createSsrRpc("de04add81d5e177df4a1aba62cf47b1e9b203b8a0ca452334191daf476fc402c"));
var createService = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("07c09506ca21f4d474d40fd1cbb928fc3f26f010dd4b7dfa5ea42fdd80798f70"));
var updateService = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("93409329e23c3189b7c423e9cdcf512c317c76a4e19d2fa424acd315ec1668b4"));
var assignClientService = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("1793c654c1be3019c42468a8a5a5628baf00352e7a0d9a1547664b5169d8a502"));
var unassignClientService = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("e4f42a03f32e561b5fd34a797d36546cb59880f7589292b9f737cea21eaad241"));
var getWorkspace = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("b915ed762966c094997df0b3cc570b03e9b9cda27d5eaee53d8288d22f1ae2f8"));
var addSection = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("a911e1c183c25d5eef91cc3390d3c16978f08f269f4865cc6577a4ca5b468c9d"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("77e53bf358bbfd22054333624d87498ce1fc4adf4a895338b848f00629f09807"));
var deleteSection = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("6a098af7c56807c80da5169958340a1b714b716607a9d0f119627e03805aad3b"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("7c7e6e4954bde0d9b79508008c250cb7b8898a6b66a0988405cac6e2c5c059ee"));
var saveActivity = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("c1bd80c824da6c24f9f625b552149323549daa859145c25630413cd602a6f94e"));
var deleteActivity = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("ce10f73be66628bdacacd879b3b008acbd5e67962d75832a53a53daad2041e9c"));
var duplicatePeriod = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("8e4685c5fbb4d590d200480ace0d3428b01e9ae23a6115ff5c67c172bcbd04f1"));
var savePayment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("ec8c38bc0065a9bc378f32bddcf1a1b2d48dda30d4eb5e5376df02f70ce6103d"));
var deletePayment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("0e4a60d9a55dc6cebbeab18829f3e59f40949e078844257b216af163f66c0adf"));
var listPayments = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("f8a427d0818f7251ab479407dcd311bfc23ea014bd14b7d7effd41fc9690f147"));
var getDashboard = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("9702758c6fd0cb855b9213cc5e565c91c6cccffe5c6a276226117b92c405025e"));
var getMonthSummary = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("28d9c4a370d0655a7d38499b4e092f60f3b15f2c5c57fa12ef101bd55e6b3ae6"));
var getFounderSummary = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("972672b6a58e1f1278065b967050f05ba177e87d4fbdf63fe11de373db77cd56"));
var getClientReport = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("79db7cbf96b9ffec7b5a5808592a660747b3c85878b489d43e56b33774587d0b"));
var getCombinedReport = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("bb7cdb89ff5ffa19ae1a6d0326b84af49c0675950088e26b3064c5c630b32437"));
var listUsers = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("aef34a5aece07e29a255ceb1fea6e97fc1287de66911f39a73e869157bbe6734"));
var updateUserAccess = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("8edb9d36713a0114967a4e80892d32868cc6f1323f4b75d3efa10e606acac74d"));
var createEmailUser = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("9afc6b069f16c50d79a5a02259e78884bf6de2d6090edf1194ecc613d4fa7eb2"));
var listAudit = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("110e50625f84053be0eeffeec0506aaf0c27a45fa23d14010fc0a8294fb82d72"));
var createBackup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d ?? {}).handler(createSsrRpc("4277d8104e9cedac6635f483ca81d1a14d52740a076eab43aa898388fc821d6b"));
var listBackups = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("b9b985750b888838acf66106710f8e0f42dec2b38285dd99a4966d1fffb8b984"));
var restoreBackup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d) => d).handler(createSsrRpc("3829e6808fc391be3e09e4737397e197c743f951b6cbee5a8bfd1032868c6747"));
function useAsync(fn, deps) {
	const [data, setData] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const reload = (0, import_react.useCallback)(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		fn().then((value) => {
			if (!cancelled) setData(value);
		}).catch((err) => {
			if (cancelled) return;
			const message = err instanceof Error ? err.message : "Something went wrong.";
			setError(message);
		}).finally(() => {
			if (!cancelled) setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, deps);
	(0, import_react.useEffect)(() => {
		return reload();
	}, [reload]);
	return {
		data,
		error,
		loading,
		reload,
		setData
	};
}
//#endregion
export { updateSettings as A, listUsers as C, unassignClientService as D, savePayment as E, useAsync as M, updateClient as O, listServices as S, saveActivity as T, getWorkspace as _, createEmailUser as a, listClients as b, deletePayment as c, getClientReport as d, getCombinedReport as f, getSessionWorkspace as g, getMonthSummary as h, createClient as i, updateUserAccess as j, updateService as k, deleteSection as l, getFounderSummary as m, assignClientService as n, createService as o, getDashboard as p, createBackup as r, deleteActivity as s, addSection as t, duplicatePeriod as u, listAudit as v, restoreBackup as w, listPayments as x, listBackups as y };
