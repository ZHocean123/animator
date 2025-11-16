Object.defineProperty(exports, '__esModule', { value: true });
const require_chunk = require('./chunk-yMphLNIk.js');
require('./GitAdapter-tH2STOUR.js');
require('./Git-DC9oIWIa.js');
require('./Watcher-D60u-m7p.js');
require('./semverBumpPackageJson-CH_febdq.js');
require('./MasterGitProject-DTM6veSH.js');
require('./MasterModuleProject-YPYLSunN.js');
require('./saveExport-Vfms7PkU.js');
require('./getExporterListener-Ns1UPSh3.js');
const require_Raven = require('./Raven-DOdYSuh1.js');
const require_ProjectDefinitions = require('./ProjectDefinitions-B9o1JAee.js');
require('./createCDNBundle-Djf1lFvt.js');
require('./AssetUtils-rixGGGPG.js');
const require_Master = require('./Master-DOE8DBio.js');
require('./getResourcesPath-mQNCwpvv.js');
const require_copyExternalExampleFilesToProject = require('./copyExternalExampleFilesToProject-j9bM5QZD.js');
const require_duplicateProject = require('./duplicateProject-bsepDNRm.js');
let path = require("path");
path = require_chunk.__toESM(path);
let async = require("async");
async = require_chunk.__toESM(async);
let haiku_serialization_src_utils_LoggerInstance = require("haiku-serialization/src/utils/LoggerInstance");
haiku_serialization_src_utils_LoggerInstance = require_chunk.__toESM(haiku_serialization_src_utils_LoggerInstance);
let lodash = require("lodash");
lodash = require_chunk.__toESM(lodash);
let haiku_serialization_src_bll_BaseModel = require("haiku-serialization/src/bll/BaseModel");
haiku_serialization_src_bll_BaseModel = require_chunk.__toESM(haiku_serialization_src_bll_BaseModel);
let ws = require("ws");
ws = require_chunk.__toESM(ws);
let events = require("events");
let haiku_serialization_src_bll_Lock = require("haiku-serialization/src/bll/Lock");
let haiku_sdk_creator_lib_exporter = require("haiku-sdk-creator/lib/exporter");
let haiku_sdk_creator_lib_bll_Error = require("haiku-sdk-creator/lib/bll/Error");
let __haiku_sdk_client_lib_createProjectFiles = require("@haiku/sdk-client/lib/createProjectFiles");
let lodash_find = require("lodash.find");
lodash_find = require_chunk.__toESM(lodash_find);
let lodash_merge = require("lodash.merge");
lodash_merge = require_chunk.__toESM(lodash_merge);
let lodash_filter = require("lodash.filter");
lodash_filter = require_chunk.__toESM(lodash_filter);
let net = require("net");
net = require_chunk.__toESM(net);
let qs = require("qs");
qs = require_chunk.__toESM(qs);
let haiku_sdk_creator_lib_envoy_EnvoyServer = require("haiku-sdk-creator/lib/envoy/EnvoyServer");
haiku_sdk_creator_lib_envoy_EnvoyServer = require_chunk.__toESM(haiku_sdk_creator_lib_envoy_EnvoyServer);
let haiku_sdk_creator_lib_envoy_EnvoyLogger = require("haiku-sdk-creator/lib/envoy/EnvoyLogger");
haiku_sdk_creator_lib_envoy_EnvoyLogger = require_chunk.__toESM(haiku_sdk_creator_lib_envoy_EnvoyLogger);
let haiku_sdk_creator_lib_bll_User = require("haiku-sdk-creator/lib/bll/User");
let haiku_sdk_creator_lib_bll_Project = require("haiku-sdk-creator/lib/bll/Project");
let haiku_sdk_creator_lib_glass = require("haiku-sdk-creator/lib/glass");
let haiku_sdk_creator_lib_timeline = require("haiku-sdk-creator/lib/timeline");
let haiku_sdk_creator_lib_tour = require("haiku-sdk-creator/lib/tour");
let haiku_sdk_creator_lib_services = require("haiku-sdk-creator/lib/services");
let __haiku_sdk_inkstone = require("@haiku/sdk-inkstone");
let __haiku_sdk_client = require("@haiku/sdk-client");
let haiku_serialization_src_utils_serializeError = require("haiku-serialization/src/utils/serializeError");
haiku_serialization_src_utils_serializeError = require_chunk.__toESM(haiku_serialization_src_utils_serializeError);
let haiku_serialization_src_utils_Mixpanel = require("haiku-serialization/src/utils/Mixpanel");
haiku_serialization_src_utils_Mixpanel = require_chunk.__toESM(haiku_serialization_src_utils_Mixpanel);

//#region src/Plumbing.js
global.eval = () => {};
process.env.HAIKU_SUBPROCESS = "plumbing";
Error.stackTraceLimit = Infinity;
const HAIKU_WS_SECURITY_TOKEN = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);
const WS_POLICY_VIOLATION_CODE = 1008;
const IGNORED_METHOD_MESSAGES = {
	setTimelineTime: true,
	masterHeartbeat: true
};
const METHOD_MESSAGES_TO_HANDLE_IMMEDIATELY = {
	setTimelineTime: true,
	masterHeartbeat: true,
	openTextEditor: true,
	openTerminal: true,
	saveProject: true,
	previewProject: true,
	teardownMaster: true,
	hoverElement: true,
	unhoverElement: true
};
const Q_GLASS = { alias: "glass" };
const Q_TIMELINE = { alias: "timeline" };
const Q_CREATOR = { alias: "creator" };
const Q_MASTER = { alias: "master" };
const AWAIT_INTERVAL = 100;
const WAIT_DELAY = 30 * 1e3;
const HAIKU_DEFAULTS = { socket: {
	port: process.env.HAIKU_PLUMBING_PORT,
	host: process.env.HAIKU_PLUMBING_HOST || "0.0.0.0"
} };
const PINFO = `${process.pid} ${path.basename(__filename)} ${path.basename(process.execPath)}`;
const PLUMBING_INSTANCES = [];
const FALLBACK_SEMVER_VERSION = "0.0.0";
const teardownPlumbings = (cb) => {
	return async.each(PLUMBING_INSTANCES, (plumbing, next) => {
		return plumbing.teardown(next);
	}, cb);
};
process.on("exit", (code) => {
	haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] plumbing process (${PINFO}) exiting with code ${code}`);
	teardownPlumbings(() => {});
});
process.on("SIGINT", () => {
	haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] plumbing process (${PINFO}) SIGINT`);
	teardownPlumbings(process.exit);
});
process.on("SIGTERM", () => {
	haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] plumbing process (${PINFO}) SIGTERM`);
	teardownPlumbings(process.exit);
});
var Plumbing = class extends events.EventEmitter {
	constructor() {
		super();
		PLUMBING_INSTANCES.push(this);
		this.state = {};
		this.masters = {};
		this.servers = [];
		this.clients = [];
		this.requests = {};
		this._isTornDown = false;
		this._methodMessages = [];
		this.executeMethodMessagesWorker();
	}
	emitError(error) {}
	launch(haiku = {}, cb) {
		haiku = lodash_merge({}, HAIKU_DEFAULTS, haiku);
		haiku_serialization_src_utils_LoggerInstance.info("[plumbing] launching plumbing", haiku);
		this.envoyServer = new haiku_sdk_creator_lib_envoy_EnvoyServer.default({
			WebSocket: ws,
			token: HAIKU_WS_SECURITY_TOKEN,
			logger: new haiku_sdk_creator_lib_envoy_EnvoyLogger.default("warn", haiku_serialization_src_utils_LoggerInstance)
		});
		return this.envoyServer.ready().then(() => {
			if (!haiku.envoy) haiku.envoy = {};
			haiku.envoy.port = this.envoyServer.port;
			haiku.envoy.host = this.envoyServer.host;
			haiku.envoy.token = HAIKU_WS_SECURITY_TOKEN;
			const error = new haiku_sdk_creator_lib_bll_Error.ErrorHandler(this.envoyServer);
			if (global.sentryReporter) global.sentryReporter.envoy = error;
			const user = new haiku_sdk_creator_lib_bll_User.UserHandler(this.envoyServer);
			this.envoyHandlers = {
				error,
				timeline: new haiku_sdk_creator_lib_timeline.TimelineHandler(this.envoyServer),
				tour: new haiku_sdk_creator_lib_tour.TourHandler(this.envoyServer),
				exporter: new haiku_sdk_creator_lib_exporter.ExporterHandler(user, this.envoyServer),
				glass: new haiku_sdk_creator_lib_glass.GlassHandler(this.envoyServer),
				user,
				project: new haiku_sdk_creator_lib_bll_Project.ProjectHandler(user, this.envoyServer),
				services: new haiku_sdk_creator_lib_services.ServicesHandler(this.envoyServer)
			};
			this.envoyServer.bindHandler(haiku_sdk_creator_lib_bll_Error.ERROR_CHANNEL, haiku_sdk_creator_lib_bll_Error.ErrorHandler, this.envoyHandlers.error);
			this.envoyServer.bindHandler(haiku_sdk_creator_lib_timeline.TIMELINE_CHANNEL, haiku_sdk_creator_lib_timeline.TimelineHandler, this.envoyHandlers.timeline);
			this.envoyServer.bindHandler(haiku_sdk_creator_lib_tour.TOUR_CHANNEL, haiku_sdk_creator_lib_tour.TourHandler, this.envoyHandlers.tour);
			this.envoyServer.bindHandler(haiku_sdk_creator_lib_exporter.EXPORTER_CHANNEL, haiku_sdk_creator_lib_exporter.ExporterHandler, this.envoyHandlers.exporter);
			this.envoyServer.bindHandler(haiku_sdk_creator_lib_bll_User.USER_CHANNEL, haiku_sdk_creator_lib_bll_User.UserHandler, this.envoyHandlers.user);
			this.envoyServer.bindHandler(haiku_sdk_creator_lib_glass.GLASS_CHANNEL, haiku_sdk_creator_lib_glass.GlassHandler, this.envoyHandlers.glass);
			this.envoyServer.bindHandler(haiku_sdk_creator_lib_bll_Project.PROJECT_CHANNEL, haiku_sdk_creator_lib_bll_Project.ProjectHandler, this.envoyHandlers.project);
			this.envoyServer.bindHandler(haiku_sdk_creator_lib_services.SERVICES_CHANNEL, haiku_sdk_creator_lib_services.ServicesHandler, this.envoyHandlers.services);
			this.envoyHandlers.user.on(`${haiku_sdk_creator_lib_bll_User.USER_CHANNEL}:load`, ({ user: { Username }, organization: { Name } }) => {
				haiku_serialization_src_utils_Mixpanel.mergeToPayload({ distinct_id: Username });
				if (require_Raven.Raven_default) require_Raven.Raven_default.mergeContext({
					user: { email: Username },
					extra: { organizationName: Name }
				});
			});
			haiku_serialization_src_utils_LoggerInstance.info("[plumbing] launching plumbing control server");
			haiku.socket.token = HAIKU_WS_SECURITY_TOKEN;
			return this.launchControlServer(haiku.socket, haiku.envoy.host, (err, server, host, port) => {
				if (err) return cb(err);
				process.env.HAIKU_PLUMBING_PORT = port;
				process.env.HAIKU_PLUMBING_HOST = host;
				process.env.HAIKU_WS_SECURITY_TOKEN = HAIKU_WS_SECURITY_TOKEN;
				if (!haiku.socket) haiku.socket = {};
				haiku.socket.port = port;
				haiku.socket.host = host;
				haiku.plumbing = { url: `http://${host}:${port}` };
				this.servers.push(server);
				server.on("connection", (websocket, request) => {
					const params = getWsParams(websocket, request);
					if (haiku.socket.token && params.token !== haiku.socket.token) {
						haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] websocket connected with bad token ${params.token}`);
						websocket.close(WS_POLICY_VIOLATION_CODE, "forbidden");
						return;
					}
					if (!params.type) params.type = "default";
					if (!params.haiku) params.haiku = {};
					if (!websocket.params) websocket.params = params;
					const type = websocket.params && websocket.params.type;
					const alias = websocket.params && websocket.params.alias;
					const folder = websocket.params && websocket.params.folder;
					haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] websocket for ${folder || "main"} connected (${type} ${alias})`);
					for (let i = this.clients.length - 1; i >= 0; i--) {
						const client = this.clients[i];
						if (client.params) {
							if (client.params.alias === alias && client.params.folder === folder) {
								if (client.readyState === ws.OPEN) client.close();
								this.clients.splice(i, 1);
							}
						}
					}
					this.clients.push(websocket);
					websocket.on("close", () => {
						haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] websocket for ${folder || "main"} closed (${type} ${alias})`);
						this.removeWebsocketClient(websocket);
						this.haltMasterForFolder(folder);
					});
					websocket.on("error", (err$1) => {
						haiku_serialization_src_utils_LoggerInstance.error(`[plumbing] websocket for ${folder || "main"} errored (${type} ${alias})`, err$1);
						throw err$1;
					});
					websocket.on("message", (data) => {
						const message = JSON.parse(data);
						this.handleRemoteMessage(type, alias, message.folder || folder, message, createResponder(message, websocket));
					});
				});
				if (haiku.mode !== "headless") {
					if (typeof process.send === "function") process.send({
						haiku,
						message: "launchCreator"
					});
					else if (process.versions && !!process.versions.electron) {
						global.process.env.HAIKU_ENV = JSON.stringify(haiku);
						require("haiku-creator/lib/electron");
					}
				}
				return cb(null, host, port, server, null, haiku.envoy);
			});
		});
	}
	removeWebsocketClient(websocket) {
		for (let j = this.clients.length - 1; j >= 0; j--) if (this.clients[j] === websocket) this.clients.splice(j, 1);
	}
	/**
	* @method invokeAction
	* @description Convenience wrapper around making a generic action call
	*/
	invokeAction(folder, method, params, cb) {
		params.unshift(folder);
		return this.handleRemoteMessage("controller", "plumbing", folder, {
			method,
			params,
			folder,
			type: "action"
		}, cb);
	}
	handleRemoteMessage(type, alias, folder, message, cb) {
		if (!folder && message.folder) folder = message.folder;
		if (message.type === "relay") return this.relayMessage(folder, message);
		if (message.type === "broadcast") {
			this.findMasterByFolder(folder).handleBroadcast(message);
			return this.sendBroadcastMessage(message, folder, alias);
		}
		if (message.id && this.requests[message.id]) {
			const { callback } = this.requests[message.id];
			delete this.requests[message.id];
			return callback(message.error, message.result, message);
		}
		if (message.method) return this.processMethodMessage(type, alias, folder, message, cb);
	}
	methodMessageBeforeLog(message, alias) {
		if (!IGNORED_METHOD_MESSAGES[message.method]) haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] ↓-- ${message.method} via ${alias} --↓`);
	}
	methodMessageAfterLog(message, err, result, alias) {
		if (!IGNORED_METHOD_MESSAGES[message.method]) {
			if (err && err.message || err && err.stack) haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] ${message.method} error ${err.stack || err.message}`);
			haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] ↑-- ${message.method} via ${alias} --↑`);
		}
	}
	executeMethodMessagesWorker() {
		if (this._isTornDown) return;
		const nextMethodMessage = this._methodMessages.shift();
		if (!nextMethodMessage) return setTimeout(() => this.executeMethodMessagesWorker(), 64);
		const { type, alias, folder, message, cb } = nextMethodMessage;
		this.methodMessageBeforeLog(message, alias);
		if (message.type === "action") return this.handleClientAction(type, alias, folder, message.method, message.params, (err, result) => {
			this.methodMessageAfterLog(message, err, result, alias);
			cb(err, result);
			this.executeMethodMessagesWorker();
		});
		return this.plumbingMethod(message.method, message.params || [], (err, result) => {
			this.methodMessageAfterLog(message, err, result, alias);
			cb(err, result);
			this.executeMethodMessagesWorker();
		});
	}
	processMethodMessage(type, alias, folder, message, cb) {
		if (METHOD_MESSAGES_TO_HANDLE_IMMEDIATELY[message.method]) {
			if (message.type === "action") return this.handleClientAction(type, alias, folder, message.method, message.params, cb);
			return this.plumbingMethod(message.method, message.params, cb);
		}
		this._methodMessages.push({
			type,
			alias,
			folder,
			message,
			cb
		});
	}
	sendBroadcastMessage(message, folder, alias) {
		this.clients.forEach((client) => {
			if (client && client.params && client.params.alias === alias) return;
			if (client.readyState !== ws.OPEN) return;
			delete message.id;
			sendMessageToClient(client, lodash_merge(message, {
				folder,
				alias
			}));
		});
	}
	sendMessageToCreator(message, folder, alias) {
		this.clients.forEach((client) => {
			if (client.readyState !== ws.OPEN || client.params.alias !== "creator") return;
			delete message.id;
			sendMessageToClient(client, lodash_merge(message, {
				folder,
				alias
			}));
		});
	}
	plumbingMethod(method, params = [], cb) {
		if (typeof this[method] !== "function") return cb(/* @__PURE__ */ new Error(`Plumbing has no method '${method}'`));
		return this[method].apply(this, params.concat((error, result) => {
			if (error) return cb(error);
			return cb(null, result);
		}));
	}
	awaitClientWithQuery(query, timeout, cb) {
		if (!query) throw new Error("Query is required");
		const fixed = { alias: query.alias };
		if (fixed.alias !== "creator") {
			if (query.folder) fixed.folder = query.folder;
		}
		if (timeout <= 0) {
			haiku_serialization_src_utils_LoggerInstance.warn(`[plumbing] timed out waiting for client ${JSON.stringify(fixed)}`);
			return cb(/* @__PURE__ */ new Error("E_TIMEOUT"));
		}
		const clientMatching = lodash_find(this.clients, { params: fixed });
		if (clientMatching) return cb(null, clientMatching);
		return setTimeout(() => {
			return this.awaitClientWithQuery(query, timeout - AWAIT_INTERVAL, cb);
		}, AWAIT_INTERVAL);
	}
	relayMessage(folder, message) {
		let clientSpec;
		if (message.view === "glass") clientSpec = Q_GLASS;
		if (message.view === "timeline") clientSpec = Q_TIMELINE;
		if (message.view === "creator") clientSpec = Q_CREATOR;
		if (message.view === "master") clientSpec = Q_MASTER;
		const clientQuery = lodash.assign({ folder }, clientSpec);
		haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] relaying ${message.name} to ${message.view}`);
		return this.awaitClientWithQuery(clientQuery, WAIT_DELAY, (_, client) => {
			if (client) return this.sendClientMessage(client, message);
		});
	}
	sendQueriedClientMethod(query = {}, method, params = [], cb) {
		return this.awaitClientWithQuery(query, WAIT_DELAY, (err, client) => {
			if (err) return cb(err);
			return this.sendClientMethod(client, method, params, (error, response) => {
				if (error) throw error;
				return cb(error, response);
			});
		});
	}
	sendClientMethod(websocket, method, params = [], callback) {
		const message = {
			method,
			params
		};
		return this.sendClientRequest(websocket, message, callback);
	}
	sendClientRequest(websocket, message, callback) {
		if (message.id === void 0) message.id = `${Math.random()}`;
		this.requests[message.id] = {
			websocket,
			message,
			callback
		};
		return this.sendClientMessage(websocket, message);
	}
	sendClientMessage(websocket, message) {
		const data = JSON.stringify(message);
		if (websocket.readyState === ws.OPEN) return websocket.send(data, (err) => {
			if (err) {
				haiku_serialization_src_utils_LoggerInstance.error(err);
				throw err;
			}
		});
		throw new Error("WebSocket is not open");
	}
	teardown(cb) {
		haiku_serialization_src_utils_LoggerInstance.info("[plumbing] teardown method called");
		return async.eachOfSeries(this.masters, (master, folder, next) => {
			this.teardownMaster(folder, () => {
				master.teardown(next);
			});
		}, () => {
			if (this.envoyServer) {
				haiku_serialization_src_utils_LoggerInstance.info("[plumbing] closing envoy server");
				this.envoyServer.close();
			}
			this.servers.forEach((server) => {
				haiku_serialization_src_utils_LoggerInstance.info("[plumbing] closing server");
				server.close();
			});
			this._isTornDown = true;
			if (cb) cb();
		});
	}
	/**
	* Outward-facing
	*/
	masterHeartbeat(folder, cb) {
		return this.awaitMasterAndCallMethod(folder, "masterHeartbeat", [{ from: "master" }], cb);
	}
	/**
	* @method copyDefaultSketchFile
	* @description copy the default Sketch file to the given project
	*/
	copyDefaultSketchFile(projectName, assetPath, cb) {
		return cb(require_copyExternalExampleFilesToProject.copyDefaultSketchFile(projectName, assetPath));
	}
	/**
	* @method copyDefaultIllustratorFile
	* @description copy the default Illustrator file to the given project
	*/
	copyDefaultIllustratorFile(projectName, assetPath, cb) {
		return cb(require_copyExternalExampleFilesToProject.copyDefaultIllustratorFile(projectName, assetPath));
	}
	/**
	* @method bootstrapProject
	* @description Flexible method for setting up a project based on an unknown file system state and possibly missing inputs.
	* We make a decision here as to where + whether to generate a new folder.
	* When it is ready, we kick off the content initialization step with initializeFolder.
	*/
	bootstrapProject(project, finish) {
		require_Raven.Raven_default.mergeContext({ extra: {
			...require_Raven.Raven_default.getContext().extra,
			projectName: project.projectName,
			projectPath: project.projectPath
		} });
		(0, require_ProjectDefinitions.ProjectDefinitions_exports.storeConfigValues)(project.projectPath, {
			username: project.authorName,
			organization: project.organizationName,
			project: project.projectName,
			branch: project.branchName
		}, { version: FALLBACK_SEMVER_VERSION });
		return async.series([(cb) => {
			if (project.skipContentCreation) {
				haiku_serialization_src_utils_LoggerInstance.info("[plumbing] skipping content creation (I)");
				return cb();
			}
			return (0, __haiku_sdk_client_lib_createProjectFiles.createProjectFiles)(project, cb);
		}, (cb) => {
			this.upsertMaster({
				folder: path.normalize(project.projectPath),
				envoyOptions: {
					host: this.envoyServer.host,
					port: this.envoyServer.port,
					token: process.env.HAIKU_WS_SECURITY_TOKEN
				},
				fileOptions: {
					doWriteToDisk: true,
					skipDiffLogging: false
				},
				envoyHandlers: this.envoyHandlers
			});
			cb();
		}], (err) => {
			if (err) return finish(err);
			return this.initializeFolder(project, (err$1) => {
				if (err$1) return finish(err$1);
				return finish(null);
			});
		});
	}
	/**
	* @method initializeFolder
	* @description Assuming we already have a folder created, an organization name, etc., now bootstrap the folder itself.
	*/
	initializeFolder(project, cb) {
		return this.awaitMasterAndCallMethod(project.projectPath, "initializeFolder", [project, { from: "master" }], cb);
	}
	startProject({ projectPath }, cb) {
		return this.awaitMasterAndCallMethod(projectPath, "startProject", [{ from: "master" }], cb);
	}
	resendEmailConfirmation(username, cb) {
		return __haiku_sdk_inkstone.inkstone.user.requestConfirmEmail(username, cb);
	}
	getenv(cb) {
		return cb(null, __haiku_sdk_client.client.config.getenv());
	}
	setenv(environmentVariables, cb) {
		return cb(null, __haiku_sdk_client.client.config.setenv(environmentVariables));
	}
	duplicateProject(destinationProject, sourceProject, cb) {
		if (!sourceProject.projectExistsLocally) {
			haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] source project did not exist during duplicate: ${sourceProject.projectName}`);
			return cb();
		}
		if (destinationProject.projectExistsLocally) haiku_serialization_src_utils_LoggerInstance.warn(`[plumbing] source project existed locally during duplicate: ${destinationProject.projectName}`);
		require_duplicateProject.duplicateProject(destinationProject, sourceProject, (err) => {
			if (err) haiku_serialization_src_utils_LoggerInstance.warn(`[plumbing] error during project duplication: ${err}`);
			cb();
		});
	}
	haltMasterForFolder(folder) {
		if (this.masters[folder] && this.masters[folder].active) this.masters[folder].halt();
	}
	teardownMaster(folder, cb) {
		haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] tearing down master ${folder}`);
		(0, haiku_serialization_src_bll_Lock.awaitAllLocksFree)(() => {
			this.haltMasterForFolder(folder);
			lodash_filter(this.clients, { params: { folder } }).forEach((clientOfFolder) => {
				const alias = clientOfFolder.params.alias;
				if (alias === "glass" || alias === "timeline") {
					haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] closing client ${alias} of ${folder}`);
					clientOfFolder.close();
					this.removeWebsocketClient(clientOfFolder);
				}
			});
			for (let i = this._methodMessages.length - 1; i >= 0; i--) if (this._methodMessages[i].folder === folder) {
				haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] clearing message`);
				this._methodMessages.splice(i, 1);
			}
			haiku_serialization_src_bll_BaseModel.extensions.forEach((klass) => klass.purge());
			require_Raven.Raven_default.mergeContext({ extra: {
				...require_Raven.Raven_default.getContext().extra,
				projectName: void 0,
				projectPath: void 0
			} });
			cb();
		});
	}
	saveProject(project, saveOptions, cb) {
		if (!saveOptions) saveOptions = {};
		haiku_serialization_src_utils_LoggerInstance.info("[plumbing] saving with options", saveOptions);
		return this.awaitMasterAndCallMethod(project.projectPath, "saveProject", [
			project,
			saveOptions,
			{ from: "master" }
		], cb);
	}
	checkInkstoneUpdates(query = "", cb) {
		const authToken = __haiku_sdk_client.client.config.getAuthToken();
		return __haiku_sdk_inkstone.inkstone.updates.check(authToken, query, cb);
	}
	listAssets(folder, cb) {
		return this.awaitMasterAndCallMethod(folder, "fetchAssets", [{ from: "master" }], cb);
	}
	linkAsset(assetAbspath, folder, cb) {
		return this.awaitMasterAndCallMethod(folder, "linkAsset", [assetAbspath, { from: "master" }], cb);
	}
	bulkLinkAssets(assetsAbspaths, folder, cb) {
		return this.awaitMasterAndCallMethod(folder, "bulkLinkAssets", [assetsAbspaths, { from: "master" }], cb);
	}
	unlinkAsset(assetRelpath, folder, cb) {
		return this.awaitMasterAndCallMethod(folder, "unlinkAsset", [assetRelpath, { from: "master" }], cb);
	}
	readAllStateValues(folder, relpath, cb) {
		return this.awaitMasterAndCallMethod(folder, "readAllStateValues", [relpath, { from: "master" }], cb);
	}
	readAllEventHandlers(folder, relpath, cb) {
		return this.awaitMasterAndCallMethod(folder, "readAllEventHandlers", [relpath, { from: "master" }], cb);
	}
	handleClientAction(type, alias, folder, method, params, cb) {
		params = params.slice(1);
		return async.eachSeries([
			Q_GLASS,
			Q_TIMELINE,
			Q_CREATOR,
			Q_MASTER
		], (clientSpec, nextStep) => {
			if (clientSpec.alias === alias) return nextStep();
			logActionInitiation(method, clientSpec);
			if (clientSpec === Q_MASTER) return this.awaitMasterAndCallMethod(folder, method, params, nextStep);
			this.sendQueriedClientMethod(lodash.assign({ folder }, clientSpec), method, params, () => {});
			return nextStep();
		}, (err) => {
			return logAndHandleActionResult(err, cb, method, type, alias);
		});
	}
};
function logActionInitiation(method, clientSpec) {
	if (!IGNORED_METHOD_MESSAGES[method]) haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] -> client action ${method} being sent to ${clientSpec.alias}`);
}
function logAndHandleActionResult(err, cb, method, type, alias) {
	if (!IGNORED_METHOD_MESSAGES[method]) {
		const status = err ? "errored" : "completed";
		haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] <- client action ${method} from ${type}@${alias} ${status}`, err);
	}
	if (err) {
		if (cb) return cb(err);
		return;
	}
	if (cb) return cb();
}
Plumbing.prototype.awaitMasterAndCallMethod = function(folder, method, params, cb) {
	const master = this.findMasterByFolder(folder);
	if (!master) return setTimeout(() => this.awaitMasterAndCallMethod(folder, method, params, cb), AWAIT_INTERVAL);
	return master.handleMethodMessage(method, params, cb);
};
Plumbing.prototype.findMasterByFolder = function(folder) {
	return this.masters[folder];
};
Plumbing.prototype.upsertMaster = function({ folder, fileOptions, envoyOptions, envoyHandlers }) {
	const remote = (payload, cb) => {
		return this.handleRemoteMessage("controllee", "master", folder, payload, cb);
	};
	if (!this.masters[folder]) {
		const master = new require_Master.Master(folder, fileOptions, envoyOptions, envoyHandlers);
		master.on("assets-changed", (master$1, assets) => {
			remote({
				assets,
				type: "broadcast",
				name: "assets-changed",
				folder: master$1.folder
			}, () => {});
		});
		master.on("component:reload", (master$1, file) => {
			remote({
				type: "broadcast",
				name: "component:reload",
				folder: master$1.folder,
				relpath: file.relpath
			}, () => {});
		});
		master.on("project-state-change", (payload) => {
			remote(lodash.assign({
				type: "broadcast",
				name: "project-state-change",
				folder: master.folder
			}, payload), () => {});
		});
		this.masters[folder] = master;
	}
	this.masters[folder].active = true;
	return this.masters[folder];
};
let portrange = 45032;
function getPort(host, cb) {
	const port = portrange;
	portrange += 1;
	const server = net.createServer();
	server.listen(port, host);
	server.once("listening", () => {
		server.once("close", () => {
			return cb(null, port);
		});
		server.close();
	});
	server.on("error", (err) => {
		if (err && err.code === "EADDRINUSE") return getPort(host, cb);
		throw err;
	});
	return server;
}
Plumbing.prototype.launchControlServer = function launchControlServer(socketInfo, host, cb) {
	if (socketInfo && socketInfo.port) {
		haiku_serialization_src_utils_LoggerInstance.info(`[plumbing] plumbing websocket server listening on specified port ${socketInfo.port}...`);
		return cb(null, this.createControlSocket({
			host,
			port: socketInfo.port
		}), host, socketInfo.port);
	}
	return getPort(host, (err, port) => {
		if (err) return cb(err);
		return cb(null, this.createControlSocket({
			host,
			port
		}), host, port);
	});
};
Plumbing.prototype.extendEnvironment = function extendEnvironment(haiku) {
	const HAIKU_ENV = JSON.parse(process.env.HAIKU_ENV || "{}");
	lodash_merge(HAIKU_ENV, haiku);
	haiku_serialization_src_utils_LoggerInstance.info("[plumbing] environment forwarding:", JSON.stringify(HAIKU_ENV, 2, null));
	process.env.HAIKU_ENV = JSON.stringify(HAIKU_ENV);
};
function getWsParams(websocket, request) {
	const url = request.url || "";
	const query = url.split("?")[1] || "";
	const params = qs.parse(query);
	params.url = url;
	return params;
}
Plumbing.prototype.createControlSocket = function createControlSocket(socketInfo) {
	return new ws.Server({
		port: socketInfo.port,
		host: socketInfo.host
	});
};
function sendMessageToClient(client, message) {
	const data = JSON.stringify(message);
	if (client.readyState === ws.OPEN) return client.send(data, (err) => {
		if (err) throw new Error(`Error during send: ${err}`);
	});
	if (data.type || data.name || data.method) throw new Error(`Attempted message to non-open WebSocket: ${data}`);
}
function createResponder(message, websocket) {
	return function messageResponder(error, result) {
		sendMessageToClient(websocket, {
			jsonrpc: "2.0",
			id: message.id,
			result: result || void 0,
			error: error ? haiku_serialization_src_utils_serializeError(error) : void 0
		});
	};
}

//#endregion
exports.HAIKU_WS_SECURITY_TOKEN = HAIKU_WS_SECURITY_TOKEN;
exports.default = Plumbing;