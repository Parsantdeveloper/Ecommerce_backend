import express,{ Express,NextFunction,Request,Response } from "express";
import cors from "cors";
import config from "../config/config";
const securitySetup=(app:Express)=>{
    app
    .use(cors({
    origin: config.cors_origin || "http://localhost:3000", 
    credentials: true,}
    ))
    .use(express.json())
    .use((err:Error,req:Request,res:Response,next:NextFunction)=>{
        console.log(err.stack);
        if(res.headersSent){
            return next(err);
        }

        res.status(500).send({errors:{message:"Something went wrong"}})
    })
    
}

export default securitySetup;
