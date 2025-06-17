// routes/productRoutes.ts
import express, { Request, Response } from 'express';
import { upload } from '../config/multer';
import { 
  createProduct, 
  searchProducts, 
  getAllProducts, 
  deleteProduct, 
  getLowStockProducts, 
  getDeletedProducts, 
  createProductVariant, 
  updateProduct, 
  updateProductVariant, 
  deleteProductVariant, 
  getProductBySlug,
  getReels,
  getReelsPaginated,
  getTrendingProducts,
  getProductByTypes
} from '../services/productService';
import { verifyAdmin } from './auth';
const router = express.Router();
import slug from 'slug';

// Create product with images and video
router.post("/", upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  // Handle images
  const imageFiles = files.images || [];
  const imageUrls = imageFiles.map(file => ({
    url: file.path,
    public_id: file.filename,
  }));
  
  // Handle video
  let videoData = "";
  if (files.video && files.video.length > 0) {
    const videoFile = files.video[0];
    videoData = videoFile.path;
  }

  const { ...data } = req.body;
  const input = {
    name: req.body.name,
    description: req.body.description,
    video: videoData, // Store video URL from Cloudinary
    productType: req.body.productType,
    images: imageUrls, // Array of image URLs
    features: JSON.parse(req.body.features || "[]"),
    specifications: JSON.parse(req.body.specifications || "[]"),
    categoryId: JSON.parse(req.body.categoryId || "[]"),
    price: Number(req.body.price),
    discountPercent: Number(req.body.discountPercent),
    shippingCost: Number(req.body.shippingCost),
    isCustom: req.body.isCustom === "true",
    sales: req.body.sales === "true",
    salesLast: req.body.salesLast ? new Date(req.body.salesLast) : new Date(),
    custom: req.body.custom ? JSON.parse(req.body.custom) : {},
    slug: "",         // Will be generated
    totalPrice: 0     // Will be calculated
  };

  try {
    console.log(data);
    if (data.name || !data.description || data.price || data.categoryId) {
      const result = await createProduct(input);
      if (!result?.success) {
        res.status(400).json({ success: false, message: result?.message });
        return;
      }
      res.status(200).json({ success: true, message: "Product created successfully", data: result });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/slug/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug;
  try {
    const product = await getProductBySlug(slug);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Product fetched successfully", data: product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search = '', categoryId = [], maxPrice, minPrice } = req.query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const input = {
    page: pageNumber,
    limit: limitNumber,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
    search: search as string,
    slug: search as string, // Assuming slug is also used for search
    categoryId: Array.isArray(categoryId) ? categoryId.map(Number) : [Number(categoryId)],
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined
  };
  try {
    const products = await getAllProducts(input);
    res.status(200).json({ success: true, message: "Products fetched successfully", data: products });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  try {
    const result = await deleteProduct(productId);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, message: "Product deleted successfully", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * @route GET /deleted
 * @desc Gets deleted products
 * @access Admin
 */
router.get("/deleted", async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const deletedProducts = await getDeletedProducts(Number(page), Number(limit));
    res.status(200).json({ success: true, message: "Deleted products fetched successfully", data: deletedProducts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post("/:id/variants", upload.single("image"), async (req: Request, res: Response): Promise<void> => {
  const { ...data } = req.body;
  const productId = Number(req.params.id);
  const file = req.file as Express.Multer.File;

  const image = file.path;
  const imageId = file.filename;

  const input = {
    productId: productId,
    color: data.color,
    size: data.size,
    price: Number(data.price),
    stock: Number(data.stock),
    image: image,
    imageid: imageId,
  };

  try {
    console.log("Creating variant with:", input);
    const result = await createProductVariant(input);

    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product variant created successfully",
      data: result.data,
    });
    return;

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return;
  }
});

router.put("/:id", upload.array("images"), async (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  
  const files = req.files as Express.Multer.File[];
  if (files.length > 0) {
    req.body.images = files.map(file => ({
      url: file.path,
      public_id: file.filename,
    }))
  }
  
  const input = {
    id: productId,
    ...req.body
  }
  
  input.slug = slug(input.name);
  try {
    console.log("Updating product with input:", input);
    const result = await updateProduct(input);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, message: "Product updated successfully", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.delete("variants/:variantId", async (req: Request, res: Response) => {
  const variantId = Number(req.params.variantId);

  try {
    const result = await deleteProductVariant(variantId);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, message: "Product variant deleted successfully", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/low-stock", async (req: Request, res: Response) => {
  console.log("Fetching low stock products with threshold:");

  const { threshold = 10 } = req.query;
  try {
    const lowStockProducts = await getLowStockProducts(Number(threshold));
    res.status(200).json({ success: true, message: "Low stock products fetched successfully", data: lowStockProducts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.put("/variants/:variantId", upload.single("image"), async (req: Request, res: Response) => {
  const variantId = Number(req.params.variantId);
  // const file = req.file as Express.Multer.File;
  const input = {
    color: req.body.color,
    size: req.body.size,
    price: Number(req.body.price),
    stock: Number(req.body.stock),
    // image: file.path,
    // imageid: file.filename,
  };

  try {
    console.log("Updating variant with input:", input);
    const result = await updateProductVariant(variantId, input);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, message: "Product variant updated successfully", data: result.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/search", async (req: Request, res: Response) => {
  const { search = '' } = req.query;

  try {
    const products = await searchProducts(search as string);
    res.status(200).json({ success: true, message: "Products fetched successfully", data: products });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.get("/reels",async(req:Request,res:Response)=>{
 try {
    const result = await getReels();
    if(result.success){
     res.status(200).json({success:result.success,message:result.message ,data:result.data})
    }
    return;
 } catch (error) {
     res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
 }
})

router.get("/reels/paginated",async(req:Request,res:Response)=>{
    const {page,limit}=req.query;
    try {
     if(!page&& !limit){
       res.status(404).json({success:false,message:"page and limit shoudl be provided"});
       return;
     }
      const result = await getReelsPaginated(Number(page),Number(limit));
      if(result.success){
        res.status(200).json({success:true,message:"reels with pagination successfully",data:result.data ,pagination:result.pagination})
      }
      return;
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"error occured ",
            error
        })
    }
})
router.get("/trending",async(req:Request,res:Response)=>{
    try {
    
      const result = await getTrendingProducts();
      if(result.success){
        res.status(200).json({success:true,message:"got trending product successfully",data:result.data})
      }
      return;
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"error occured ",
            error
        })
    }
})

router.get("/type",async(req:Request,res:Response)=>{
   const productType=req.query.productType;
   try {
    const result = await getProductByTypes(String(productType));
    if(result?.success){
      res.status(200).json({
        success:result.success,
        message:result.message,
        data:result.data
        
      })
      return;
    }
    return;
   } catch (error) {
    res.status(500).json({
        success:false,
        message:"failed to retrieve products with types",
        error        
      })
   }
})

export default router;