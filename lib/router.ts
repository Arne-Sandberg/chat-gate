import {Logger,StringDictionary} from "chat-core";
import * as Q from "q";
import {Server, IncomingMessage, ServerResponse,createServer} from "http";
import * as URL from "url";

var httpPRoxy = require("http-proxy");

export interface RouterOptions {
    port: number;
    defaultUrl: string;
}

interface RouterReplacer{
    getTarget(req: IncomingMessage): string;
};

class SimpleReplace implements RouterReplacer{
    private serverUrl: URL.Url;

    constructor(serverAddress: string,pattern?: RegExp){
        this.serverUrl = URL.parse(serverAddress);
    }

    public getTarget(req: IncomingMessage): string{
        return URL.format(this.serverUrl);
    }
}

export class Router {
    private _urlMatchers: StringDictionary<RouterReplacer>;
    private _logger: Logger;
    private _proxyServer: any;
    private _server: Server;
    private _options: RouterOptions;

    constructor(options: RouterOptions){
        this._logger = new Logger("Router");
        this._options = options;
        this._proxyServer = httpPRoxy.createProxyServer({});
        this._server = createServer((req,res) => this.onNewRequest(req,res));
        this._urlMatchers = {};
    }

    public start(): Q.Promise<void> {
        const funcName = "start";
        this._logger.info(funcName,": Started, Going to load the routing info");
        return this.loadRoutingInfo()
            .then(() => {
                this._logger.info(funcName,": Finished loading the routing informations");
                let port = this._options.port || 8080;
                this._logger.info(funcName,": Going to start listen on ", port);
                this._server.listen(port);                
            });
    }

    public loadRoutingInfo(): Q.Promise<void>{
        const funcName = "loadRoutingInfo";
        this._logger.info(funcName,": Started");
        this._logger.info(funcName, ": Going to initialize with static lists");
        this._urlMatchers = {
            "/rest/chatmanager/": new SimpleReplace("http://localhost:8083")
        };

        this._logger.info(funcName,": Ends with ", this._urlMatchers);
        return Q.resolve();
    }

    public onNewRequest(req: IncomingMessage,res: ServerResponse){
        const funcName = "onNewRequest with request";
        this._logger.trace(funcName,": Got request from ", req.url, " request is:",req);
        let urlMatches = Object.keys(this._urlMatchers).filter((urlMatch) => {
            let url = req.url || "";
            return url.match(new RegExp(urlMatch)); 
        });

        switch(urlMatches.length){
            case 1: {
                let replacer = this._urlMatchers[urlMatches[0]];
                let redirectUrl = replacer.getTarget(req);
                this._logger.trace(funcName,": Going to redirect ", req.url, " to ",redirectUrl);
                this._proxyServer.web(req, res, { target: redirectUrl });
                return;
            }
            
            case 0:{
                let replacer = new SimpleReplace(this._options.defaultUrl, null);
                let redirectUrl = replacer.getTarget(req);
                this._logger.trace(funcName,": Got no matcher (using default) src= ", req.url, " to ",this._options.defaultUrl);
                this._proxyServer.web(req, res, { target: this._options.defaultUrl });
                return;
            }
            default:
                this._logger.error(funcName,": Got more than one match !!!", urlMatches);
                res.statusCode = 500;
                return;
        }
    }
}