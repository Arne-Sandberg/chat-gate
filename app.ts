import {Router} from "./lib/router";
import {Logger} from "chat-core";

Logger.initLogging();
let mainLogger = new Logger("GateService.MAin");

mainLogger.info("Start!");
let router = new Router({
    defaultUrl: "http://localhost:8082",
    port: 8080
});

router.start().then(() => {
    mainLogger.info("Started Listening");
});
