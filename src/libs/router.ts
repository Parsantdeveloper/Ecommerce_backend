import { Express,Request,Response } from "express";
import authRoutes from "../routes/auth";
import productRoutes from "../routes/product";
import categoryRoutes from "../routes/category";
import categoryTypeRoutes from "../routes/categoryType";
import productReview from "../routes/productReview";
import bannerRoutes from "../routes/banner";
import featuredRoutes from "../routes/featured";
import cartRoutes from "../routes/cart"
import orderRoutes from "../routes/order";
import addressRoutes from "../routes/address";
const routerSetup=(app:Express)=>{
 app
   .get("/",async(req:Request,res:Response)=>{
     res.send("hello Express APi");
   })
   .use("/api/auth",authRoutes)
   .use("/api/product",productRoutes)
   .use("/api/category",categoryRoutes)
    .use("/api/category-type",categoryTypeRoutes)
    .use("/api/product-review",productReview)
    .use("/api/banner",bannerRoutes)
    .use("/api/featured",featuredRoutes)
    .use("/api/cart",cartRoutes)
    .use("/api/orders",orderRoutes)
    .use("/api/address",addressRoutes);
}

export default routerSetup;