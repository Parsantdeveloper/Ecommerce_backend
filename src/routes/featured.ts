import express,{Request,Response} from 'express';
import { upload } from '../config/multer';
import { CreateFeaturedInput,createFeatured,getFeatured,deleteFeatured,getFeaturedById,updateFeatured} from '../services/featuredService';
const router = express.Router();


router.post('/', upload.single("image"), async (req: Request, res: Response) => {
    const {...data}= req.body;
    const imageUrl = {
        url: req.file?.path || '',
        public_id: req.file?.filename || ''
    };
    const input:CreateFeaturedInput={...data, imageUrl};
    try {
        const result = await createFeatured(input);
        if (result?.success) {
             res.status(201).json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
             res.status(400).json({
                success: false,
                message: result?.message
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating the featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        });

    }

})
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await getFeatured();
        if (result?.success) {
            res.status(200).json({
                success: true,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result?.message
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
         res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
        return;
    }
    try {
        const result = await deleteFeatured(id);
        if (result?.success) {
            res.status(200).json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                message: result?.message
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
})

router.get("/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
         res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
        return;
    }
    try {
        const result = await getFeaturedById(id);
        if (result?.success) {
             res.status(200).json({
                success: true,
                data: result.data
            });
            return;
        } else {
             res.status(404).json({
                success: false,
                message: result?.message
            });
            return;
        }
    } catch (error) {
         res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
})

router.put("/:id",  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
         res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
        return;
    }
    const {...data}= req.body;
  
    const input={...data,id};
    try {
        const result = await updateFeatured(input);
        if (result?.success) {
             res.status(200).json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
             res.status(404).json({
                success: false,
                message: result?.message
            });
        }
    } catch (error) {
         res.status(500).json({
            success: false,
            message: 'An error occurred while updating the featured',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
})
export default router;