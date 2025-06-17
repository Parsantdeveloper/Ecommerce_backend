import express from 'express';
import { createBanner,CreateBannerInput,getAllBanners,getBannerById,deleteBanner,updateBanner } from '../services/bannerService';
import { upload } from '../config/multer';

const router = express.Router();


router.post("/", upload.single("imageUrl") , async (req, res) => {
    const {...data} = req.body;
    const imageUrl={
        url: req.file?.path || "",
        public_id: req.file?.filename || ""
    }
    const input: CreateBannerInput = {...data, imageUrl};
  try {
    const result = await createBanner(input);
    if(result?.success){
        res.status(200).json({
            success: true,
            message: "Banner created successfully",
            data: result.data
        })
    }
    else {
        res.status(400).json({
            success: false,
            message: result?.message || "Failed to create banner"
        });
    }

  } catch (error) {
    res.status(500).json({
        success: false,
        message: "An error occurred while creating the banner",
        error: error instanceof Error ? error.message : "Unknown error",
        });

  }
})

router.get("/", async (req, res) => {
    try {
        const result = await getAllBanners();
        if(result?.success){
            res.status(200).json({
                success: true,
                message: "Banners fetched successfully",
                data: result.data
            })
        }
        else {
            res.status(400).json({
                success: false,
                message: result?.message || "Failed to fetch banners"
            });
        }
    
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching the banners",
            error: error instanceof Error ? error.message : "Unknown error",
            });
    
    }
})

router.get("/:id", async (req, res) => {
    const bannerId = Number(req.params.id);
    try {
        const result = await getBannerById(bannerId);
        if(result?.success){
            res.status(200).json({
                success: true,
                message: "Banner fetched successfully",
                data: result.data
            })
        }
        else {
            res.status(404).json({
                success: false,
                message: result?.message || "Banner not found"
            });
        }
    
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching the banner",
            error: error instanceof Error ? error.message : "Unknown error",
            });
    
    }
})

router.delete("/:id", async (req, res) => {
    const bannerId = Number(req.params.id);
    try {
        const result = await deleteBanner(bannerId);
        if(result?.success){
            res.status(200).json({
                success: true,
                message: "Banner deleted successfully",
                data: result.data
            })
        }
        else {
            res.status(404).json({
                success: false,
                message: result?.message || "Banner not found"
            });
        }
    
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while deleting the banner",
            error: error instanceof Error ? error.message : "Unknown error",
            });
    
    }
})

router.put("/:id", upload.single("imageUrl"), async (req, res) => {
    const bannerId = Number(req.params.id);
    const {...data} = req.body;

   
    const input = {...data};
  try {
    const result = await updateBanner(bannerId, input);
    if(result?.success){
        res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: result.data
        })
    }
    else {
        res.status(400).json({
            success: false,
            message: result?.message || "Failed to update banner"
        });
    }

  } catch (error) {
    res.status(500).json({
        success: false,
        message: "An error occurred while updating the banner",
        error: error instanceof Error ? error.message : "Unknown error",
        });

  }
})
export default router;