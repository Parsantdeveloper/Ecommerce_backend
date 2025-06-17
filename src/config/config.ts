import dotenv from "dotenv";
dotenv.config();
type env={
    port:number; 
    environment:string;
    cors_origin:string
}

const config:env={
  port:Number(process.env.PORT)||3000,
  environment:process.env.Environment||"development",
  cors_origin:process.env.CORS_ORIGIN||"http://localhost:3000"
  
}
export default config;