import express,{Request,Response} from "express"
import securitySetup from "./libs/security";
import routerSetup from "./libs/router";
import appSetup from "./libs/init";
const app = express();

securitySetup(app);
routerSetup(app);
appSetup(app);


export default app;