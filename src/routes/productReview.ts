import express, { Request, Response } from "express";
import {
  createProductReview,
  getProductReviews,
  updateProductReview,
  deleteProductReview,
} from "../services/productReviewService";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const input = { ...req.body };
  
  // Validate required fields
  if (!input.userId || !input.productId || !input.rating || !input.message) {
     res.status(400).json({
      success: false,
      message: "Missing required fields: userId, productId, rating, and message are required",
    });
    return;
  }

  // Convert and validate numeric fields
  const userId = Number(input.userId);
  const productId = Number(input.productId);
  const rating = Number(input.rating);

  if (isNaN(userId) || isNaN(productId) || isNaN(rating)) {
     res.status(400).json({
      success: false,
      message: "userId, productId, and rating must be valid numbers",
    });
    return;
  }

  if (rating < 1 || rating > 5) {
     res.status(400).json({
      success: false,
      message: "Rating must be between 1 and 5",
    });
    return;
  }

  // Assign converted values
  input.userId = userId;
  input.productId = productId;
  input.rating = rating;

  try {
    console.log("Received input:", input);
    const result = await createProductReview(input);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      // Determine appropriate status code based on error message
      const statusCode = result.message?.includes("not authorized") || 
                        result.message?.includes("purchased") ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const productId = Number(req.params.id);
  const limit = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  
  try {
    if (isNaN(productId) || productId <= 0) {
       res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    if (limit <= 0 || page <= 0) {
       res.status(400).json({
        success: false,
        message: "Limit and page must be positive numbers",
      });
      return;
    }

    const result = await getProductReviews(productId, limit, page);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        totalCount: result.totalCount,
        page: result.page,
        limit: result.limit,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const reviewId = Number(req.params.id);
  const input = { ...req.body };
  
  // Validate review ID
  if (isNaN(reviewId) || reviewId <= 0) {
     res.status(400).json({
      success: false,
      message: "Invalid review ID",
    });
  }

  // Validate required fields
  if (!input.userId || !input.productId || !input.message) {
     res.status(400).json({
      success: false,
      message: "Missing required fields: userId, productId, and message are required",
    });
  }

  // Convert and validate numeric fields
  const userId = Number(input.userId);
  const productId = Number(input.productId);
  let rating = null;

  if (isNaN(userId) || isNaN(productId)) {
     res.status(400).json({
      success: false,
      message: "userId and productId must be valid numbers",
    });
  }

  // Validate rating if provided
  if (input.rating !== undefined) {
    rating = Number(input.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
       res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5",
      });
    }
  }

  // Prepare input for service
  const serviceInput = {
    id: reviewId,
    userId: userId,
    productId: productId,
    message: input.message,
    ...(rating && { rating: rating })
  };

  try {
    console.log("Received input for update:", serviceInput);
    const result = await updateProductReview(serviceInput);

    if (result?.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      // Determine appropriate status code based on error message
      const statusCode = result?.message?.includes("not authorized") || 
                        result?.message?.includes("permission") ? 403 : 404;
      
      res.status(statusCode).json({
        success: false,
        message: result?.message || "Review not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = Number(req.query.userId);
  const productId = Number(req.query.productId);
  
  try {
    // Validate all required parameters
    if (isNaN(id) || isNaN(userId) || isNaN(productId)) {
       res.status(400).json({
        success: false,
        message: "Invalid request parameters. id, userId, and productId must be valid numbers",
      });
    }

    if (id <= 0 || userId <= 0 || productId <= 0) {
       res.status(400).json({
        success: false,
        message: "All parameters must be positive numbers",
      });
    }

    const result = await deleteProductReview(id, userId, productId);
    
    if (result?.success) {
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      // Determine appropriate status code based on error message
      const statusCode = result?.message?.includes("not authorized") || 
                        result?.message?.includes("permission") ? 403 : 404;
      
      res.status(statusCode).json({
        success: false,
        message: result?.message || "Review not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;