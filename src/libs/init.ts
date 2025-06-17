import { Express } from "express";
import config from "../config/config";
import dotenv from "dotenv"
dotenv.config();
const appSetup=(app:Express)=>{
    // try {
        app.listen(config.port,()=>{
            console.log(`server listening on ${config.port} in ${config.environment}`)
        })
    // } catch (error) {
    //     console.log("server failed ", error);
    // }
}
export default appSetup;