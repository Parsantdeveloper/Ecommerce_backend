import { prisma } from "../utils/prisma";

interface createProductReviewInput {
  rating: number;
  message: string;
  userId: number;
  productId: number;
}

interface updateProductReviewInput {
  rating?: number;
  message: string;
  userId: number;
  productId: number;
  id: number;
}

// Helper function to check if user has purchased the product
export const checkUserPurchase = async (userId: number, productId: number): Promise<boolean> => {
  try {
    const purchase = await prisma.orderItem.findFirst({
      where: {
        prductId: productId,
        order: {
          userId: userId,
          status: {
            in: ['SHIPPED', 'DELIVERED'] // Only completed/delivered orders
          }
        }
      },
      include: {
        order: true
      }
    });
    
    return !!purchase;
  } catch (error) {
    console.error('Error checking user purchase:', error);
    return false;
  }
};

// Helper function to get user role
export const getUserRole = async (userId: number): Promise<string | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Helper function to validate purchase or admin access
const validatePurchaseOrAdmin = async (userId: number, productId: number): Promise<{ canReview: boolean; reason?: string }> => {
  try {
    // Check if user is admin
    const userRole = await getUserRole(userId);
    if (userRole === 'admin' || userRole === 'ADMIN') {
      return { canReview: true };
    }

    // Check if user has purchased the product
    const hasPurchased = await checkUserPurchase(userId, productId);
    if (hasPurchased) {
      return { canReview: true };
    }

    return { 
      canReview: false, 
      reason: "You can only review products you have purchased" 
    };
  } catch (error) {
    return { 
      canReview: false, 
      reason: "Unable to verify purchase status" 
    };
  }
};

export const createProductReview = async (input: createProductReviewInput) => {
  if (!input.rating || !input.message || !input.userId || !input.productId) {
    return {
      success: false,
      message: "All fields are required",
    };
  }
  
  if (input.rating < 1 || input.rating > 5) {
    return {
      success: false,
      message: "Rating must be between 1 and 5",
    };
  }

  try {
    // Validate purchase or admin access
    const validation = await validatePurchaseOrAdmin(input.userId, input.productId);
    if (!validation.canReview) {
      return {
        success: false,
        message: validation.reason || "You are not authorized to review this product",
      };
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        userId: input.userId,
        productId: input.productId,
      },
    });
    
    if (existingReview) {
      return {
        success: false,
        message: "You have already reviewed this product",
      };
    }
    
    const review = await prisma.review.create({
      data: {
        ...input,
      },
    });
    
    if (!review) {
      return {
        success: false,
        message: "Failed to create review",
      };
    }
    
    // Update product average rating and total reviews
    const { _avg, _count } = await prisma.review.aggregate({
      where: { productId: input.productId },
      _avg: { rating: true },
      _count: true,
    });
    
    await prisma.product.update({
      where: { id: input.productId },
      data: {
        totalReviews: _count,
        averageRating: _avg.rating || 0,
      },
    });
    
    return {
      success: true,
      message: "Review created successfully",
      data: review,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create review",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getProductReviews = async (
  productId: number,
  limit: number,
  page: number
) => {
  try {
    const skip = (page - 1) * limit;

    if (!productId || productId <= 0) {
      return {
        success: false,
        message: "Invalid product ID",
      };
    }
    
    const reviews = await prisma.review.findMany({
      where: { productId },
      skip: skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    const totalCount = await prisma.review.count({
      where: { productId },
    });

    if (!reviews || reviews.length === 0) {
      return {
        success: false,
        message: "No reviews found for this product",
      };
    }
    
    return {
      success: true,
      message: "Reviews fetched successfully",
      data: reviews,
      totalCount: totalCount,
      page: page,
      limit: limit,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch reviews",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const updateProductReview = async (input: updateProductReviewInput) => {
  try {
    if (!input.message || !input.userId || !input.productId || !input.id) {
      return {
        success: false,
        message: "All fields are required",
      };
    }

    // Validate rating if provided
    if (input.rating && (input.rating < 1 || input.rating > 5)) {
      return {
        success: false,
        message: "Rating must be between 1 and 5",
      };
    }

    // Check if user is admin or owns the review
    const userRole = await getUserRole(input.userId);
    const isAdmin = userRole === 'admin' || userRole === 'ADMIN';

    const existingReview = await prisma.review.findFirst({
      where: {
        id: input.id,
        productId: input.productId,
        ...(isAdmin ? {} : { userId: input.userId }) // Admin can update any review
      },
    });
    
    if (!existingReview) {
      return {
        success: false,
        message: "Review not found or you do not have permission to update this review",
      };
    }

    // If not admin and trying to change userId, validate purchase
    if (!isAdmin && existingReview.userId !== input.userId) {
      const validation = await validatePurchaseOrAdmin(input.userId, input.productId);
      if (!validation.canReview) {
        return {
          success: false,
          message: validation.reason || "You are not authorized to review this product",
        };
      }
    }

    const review = await prisma.review.update({
      where: { id: input.id },
      data: {
        rating: input.rating || existingReview.rating,
        message: input.message,
      },
    });
    
    if (!review) {
      return {
        success: false,
        message: "Failed to update review",
      };
    }
    
    // Update product average rating and total reviews
    const { _avg, _count } = await prisma.review.aggregate({
      where: { productId: input.productId },
      _avg: { rating: true },
      _count: true,
    });
    
    await prisma.product.update({
      where: { id: input.productId },
      data: {
        totalReviews: _count,
        averageRating: _avg.rating || 0,
      },
    });
    
    return {
      success: true,
      message: "Review updated successfully",
      data: review,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to update review",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deleteProductReview = async (
  id: number,
  userId: number,
  productId: number
) => {
  try {
    if (!id || !userId || !productId) {
      return {
        success: false,
        message: "All parameters are required",
      };
    }

    // Check if user is admin
    const userRole = await getUserRole(userId);
    const isAdmin = userRole === 'admin' || userRole === 'ADMIN';

    const existingReview = await prisma.review.findFirst({
      where: {
        id: id,
        productId: productId,
        ...(isAdmin ? {} : { userId: userId }) // Admin can delete any review
      },
    });
    
    if (!existingReview) {
      return {
        success: false,
        message: "Review not found or you do not have permission to delete this review",
      };
    }
    
    const review = await prisma.review.delete({
      where: { id: id },
    });

    // Update product average rating and total reviews after deletion
    const { _avg, _count } = await prisma.review.aggregate({
      where: { productId: productId },
      _avg: { rating: true },
      _count: true,
    });
    
    await prisma.product.update({
      where: { id: productId },
      data: {
        totalReviews: _count,
        averageRating: _avg.rating || 0,
      },
    });
    
    return {
      success: true,
      message: "Review deleted successfully",
      data: review,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to delete review",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};