// services/productService.ts
import { prisma } from "../utils/prisma";
import slug from "slug";
import { destroy } from "../config/multer";

export interface createProductInput {
  name: string;
  slug: string;
  description: string;
  features: string[]; // Array of strings
  specifications: []; // Array of objects
  price: number;
  discountPercent: number;
  productType: string;
  sales: boolean;
  salesLast: Date;
  shippingCost: number;
  isCustom: boolean;
  custom: JSON; // Optional JSON for custom fields
  totalPrice: number;
  video: string;
  images: {
    url: string;
    public_id: string;
  }[];
  categoryId: number[];
}

export interface productVariants {
  productId: number;
  color: string;
  size: string;
  stock: number;
  price: number;
  image?: string;
  imageid?: string; // Optional field for image ID
}

export interface updateProductVariants {
  color?: string;
  size?: string;
  stock?: number;
  price?: number;
  image?: string;
  imageid?: string; // Optional field for image ID
}

interface getProduct {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  categoryId?: number[];
  maxPrice?: number;
  slug?: string;
  minPrice?: number;
  isDeleted?:boolean
}

export interface updateProductInput {
  id: number;
  name?: string;
  description?: string;
  features?: string[]; // Array of strings
  specifications?: []; // Array of objects
  price?: number;
  discountPercent?: number;
  productType?: string;
  sales?: boolean;
  salesLast?: Date;
  shippingCost?: number;
  isCustom?: boolean;
  custom?: JSON; // Optional JSON for custom fields
  totalPrice?: number;
  video?: string;
  images?: {
    url: string;
    public_id: string;
  }[]; // Array of image URLs
  categoryId?: number[];
}

export const createProduct = async (input: createProductInput) => {
  console.log("Creating product with input:", input);
  const { ...data } = input;
  data.totalPrice = data.price - data.price * (data.discountPercent / 100);
  data.slug = slug(data.name, { lower: true });

  const existingProduct = await prisma.product.findUnique({
    where: { slug: data.slug },
  });
  if (existingProduct) {
    return {
      success: false,
      message: "Product with this name already exists",
    };
  }
  const existingCategory = await prisma.category.findUnique({
    where: { id: data.categoryId[0] },
  });
  if (!existingCategory) {
    return {
      success: false,
      message: "Category not found",
    };
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      specifications: JSON.parse(JSON.stringify(data.specifications)),
      custom: JSON.stringify(data.custom),
      images: JSON.parse(JSON.stringify(data.images)),
    },
  });
  if (!product) {
    return {
      success: false,
      message: "Failed to create product",
    };
  }
  return {
    success: true,
    message: "Product created successfully",
    data: product,
  };
};

export const getProductBySlug = async (slug: string) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: slug },
      include: {
        variants: true,
        Category: true,
      },
    });
    if (!product) {
      return {
        success: false,
        message: "Product not found",
      };
    }
    return {
      success: true,
      message: "Product fetched successfully",
      data: product,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch product",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const getAllProducts = async (req: getProduct) => {
  try {
    const page = Number(req.page) || 1;
    const limit = Number(req.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.sortBy || "createdAt";
    const sortOrder = req.sortOrder || "desc";
    const search = req.search || "";
    const slug = req.slug || '';
    const categoryId = req.categoryId || [];

    // Initialize filter
    const whereClause: any = {};

    // Filter by isDeleted (default: false)
  if ('isDeleted' in req) {
  whereClause.isDeleted = req.isDeleted === true ;
} else {
  whereClause.isDeleted = false;
}


    // Filter by search
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by slug
    if (slug) {
      whereClause.slug = { contains: slug, mode: "insensitive" };
    }

    // Filter by category
    if (categoryId.length > 0) {
      whereClause.categoryId = { hasSome: categoryId };
    }

    // Filter by price
    if (req.maxPrice !== undefined && req.minPrice !== undefined) {
      whereClause.price = {
        gte: req.minPrice,
        lte: req.maxPrice,
      };
    }

    // Fetch products and count
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          variants: true,
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.product.count({
        where: whereClause,
      }),
    ]);

    return {
      success: true,
      message: "Products fetched successfully",
      data: products,
      totalCount,
      page,
      limit,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch products",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deleteProduct = async (id: number) => {
  try {
    if (id > 0) {
      // First, get the product to access its images and video
      const existingProduct = await prisma.product.findUnique({
        where: { id: id },
      });

      if (!existingProduct) {
        return {
          success: false,
          message: "Product not found",
        };
      }

      // Delete images from Cloudinary
      if (existingProduct.images) {
        const images = existingProduct.images as {
          url: string;
          public_id: string;
        }[];
        
        for (const image of images) {
          await destroy(image.public_id, 'image').catch((error) => {
            console.error(
              `Error deleting image with public_id: ${image.public_id}`,
              error
            );
          });
        }
      }

      // Delete video from Cloudinary if it exists
      if (existingProduct.video) {
        // Extract public_id from video URL
        // Cloudinary video URL format: https://res.cloudinary.com/[cloud_name]/video/upload/[public_id].[format]
        const videoUrl = existingProduct.video as string;
        const urlParts = videoUrl.split('/');
        const fileWithExtension = urlParts[urlParts.length - 1];
        const videoPublicId = fileWithExtension.split('.')[0];
        
        await destroy(videoPublicId, 'video').catch((error) => {
          console.error(
            `Error deleting video with public_id: ${videoPublicId}`,
            error
          );
        });
      }

      // Soft delete the product
      const product = await prisma.product.update({
        where: { id: id },
        data: {
          isDeleted: true,
          deletedAt: new Date(), // Set the deletedAt field to the current date
        },
      });

      if (product) {
        return {
          success: true,
          message: "Product deleted successfully",
          data: product,
        };
      } else {
        return {
          success: false,
          message: "Product not found",
        };
      }
    }
    return {
      success: false,
      message: "Invalid product ID",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to delete product",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getDeletedProducts = async (
  page: number = 1,
  limit: number = 10
) => {
  try {
    const skip = (page - 1) * limit;
    const products = await prisma.product.findMany({
      where: { isDeleted: true },
      skip: skip,
      take: limit,
      orderBy: { deletedAt: "desc" },
    });
    const totalCount = await prisma.product.count({
      where: { isDeleted: true },
    });
    return {
      success: true,
      message: "Deleted products fetched successfully",
      data: products,
      totalCount: totalCount,
      page: page,
      limit: limit,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch deleted products",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const createProductVariant = async (variant: productVariants) => {
  try {
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        productId: variant.productId,
        color: variant.color,
        size: variant.size,
      },
    });
    if (existingVariant) {
      return {
        success: false,
        message:
          "Variant with this color and size already exists for this product",
      };
    }
    console.log("Creating product variant with data:", variant);
    const newVariant = await prisma.productVariant.create({
      data: variant,
    });
    return {
      success: true,
      message: "Product variant created successfully",
      data: newVariant,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create product variant",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const updateProduct = async (input: updateProductInput) => {
  try {
    if (!input.id || input.id <= 0) {
      return {
        success: false,
        message: "Invalid product ID",
      };
    }
    const existingProduct = await prisma.product.findUnique({
      where: { id: input.id },
    });
    console.log("existingProduct", existingProduct);
    if (!existingProduct) {
      return {
        success: false,
        message: "Product not found",
      };
    }
    if (input.categoryId && input.categoryId.length > 0) {
      const existingCategory = await prisma.category.findUnique({
        where: { id: input.categoryId[0] },
      });
      if (!existingCategory) {
        return {
          success: false,
          message: "Category not found",
        };
      }
    }

    if (input.images && input.images.length > 0) {
      const oldImages = existingProduct.images as {
        url: string;
        public_id: string;
      }[];
      const newImages = input.images.map((image) => image.public_id);

      for (const oldImg of oldImages) {
        if (!newImages.includes(oldImg.public_id)) {
          await destroy(oldImg.public_id).catch((error) => {
            console.error(
              `Error deleting image with public_id: ${oldImg.public_id}`,
              error
            );
          });
        }
      }
    }

    const updateData: any = {
      name: input.name,
    };

    if (input.images) {
      updateData.images = JSON.parse(JSON.stringify(input.images));
    }
    if (input.specifications) {
      updateData.specifications = JSON.parse(JSON.stringify(input.specifications));
    }
    if (input.custom) {
      updateData.custom = JSON.stringify(input.custom);
    }

    const updateProduct = await prisma.product.update({
      where: { id: input.id },
      data: updateData,
    });

    if (!updateProduct) {
      return {
        success: false,
        message: "Failed to update product",
      };
    }
    return {
      success: true,
      message: "Product updated successfully",
      data: updateProduct,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to update product",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getLowStockProducts = async (threshold: number = 10) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lt: 10,
        },
      },
      include: {
        variants: true,
      },
    });
    console.log(lowStockProducts, "Low stock products fetched successfully");

    if (lowStockProducts.length === 0) {
      return {
        success: false,
        message: "No low stock products found",
      };
    }

    return {
      success: true,
      message: "Low stock products fetched successfully",
      data: lowStockProducts,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch low stock products",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const updateProductVariant = async (
  id: number,
  input: updateProductVariants
) => {
  try {
    console.log("Updating product variant with ID:", id);
    const existingVariant = await prisma.productVariant.findUnique({
      where: { id: id },
    });
    if (!existingVariant) {
      return {
        success: false,
        message: "Product variant not found",
      };
    }
    console.log("Updating product variant with data:", input);
    const updatedVariant = await prisma.productVariant.update({
      where: { id: id },
      data: input,
    });

    return {
      success: true,
      message: "Product variant updated successfully",
      data: updatedVariant,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to update product variant",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const deleteProductVariant = async (id: number) => {
  try {
    const existingVariant = await prisma.productVariant.findUnique({
      where: { id: id },
    });
    if (!existingVariant) {
      return {
        success: false,
        message: "Product variant not found",
      };
    }

    const deletedVariant = await prisma.productVariant.delete({
      where: { id: id },
    });

    return {
      success: true,
      message: "Product variant deleted successfully",
      data: deletedVariant,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to delete product variant",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const searchProducts = async (searchTerm: string) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      // Limit the number of results
      select: {
        slug: true,
        name: true,
        price: true,
        discountPercent: true,
        totalPrice: true,
        images: true,
      },
      take: 10, // Adjust the number of results as needed
    });

    if (products.length === 0) {
      return {
        success: false,
        message: "No products found",
      };
    }

    return {
      success: true,
      message: "Products fetched successfully",
      data: products,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch products",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const getReels = async () => {
  try {
    const reels = await prisma.product.findMany({
      where: {
        video: {
          not: null, // Only get products that have videos
        },
        isDeleted: false, // Exclude deleted products
      },
      select: {
        id: true,
        video: true,
        name: true,
        slug: true,
        price: true,
        discountPercent: true,
        images: true, // You might want thumbnail for fallback
        averageRating: true,
        totalReviews: true,
      },
      orderBy: {
        createdAt: 'desc', // Show newest reels first
      },
      take: 10, // Increased limit for better user experience
    });

    // Additional filtering to ensure video URLs are valid
    const validReels = reels.filter(reel => 
      reel.video && 
      reel.video.trim() !== '' && 
      (reel.video.includes('.mp4') || reel.video.includes('.mov') || reel.video.includes('.webm'))
    );

    if (validReels.length > 0) {
      return {
        success: true,
        message: "Successfully retrieved video reels",
        data: validReels,
        count: validReels.length
      };
    }
    
    return {
      success: false,
      message: "No video reels found",
      data: [],
      count: 0
    };
    
  } catch (error) {
    console.error('Error fetching reels:', error);
    return {
      success: false,
      message: "Failed to fetch video reels",
      error: error instanceof Error ? error.message : "Unknown error",
      data: []
    };
  }
};

// Alternative function for infinite scrolling/pagination
export const getReelsPaginated = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const [reels, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: {
          video: {
            not: null,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          video: true,
          name: true,
          slug: true,
          price: true,
          discountPercent: true,
          images: true,
          averageRating: true,
          totalReviews: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      // Get total count for pagination
      prisma.product.count({
        where: {
          video: {
            not: null,
          },
          isDeleted: false,
        },
      })
    ]);

    const validReels = reels.filter(reel => 
      reel.video && 
      reel.video.trim() !== '' && 
      (reel.video.includes('.mp4') || reel.video.includes('.mov') || reel.video.includes('.webm'))
    );

    return {
      success: true,
      message: "Successfully retrieved video reels",
      data: validReels,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    };
    
  } catch (error) {
    console.error('Error fetching paginated reels:', error);
    return {
      success: false,
      message: "Failed to fetch video reels",
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
      pagination: null
    };
  }
};

export const getTrendingProducts = async () => {
  try {
    const trendingProducts = await prisma.product.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        cartItems: true,
      },
      take:15
    });

    // Sort products by number of cartItems (descending)
    const sorted = trendingProducts
      .map(product => ({
        ...product,
        cartCount: product.cartItems.length,
      }))
      .sort((a, b) => b.cartCount - a.cartCount)
      .slice(0, 10); // top 10 trending

    return {
      success: true,
      message: "Trending products fetched successfully",
      data: sorted,
    };
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return {
      success: false,
      message: "Failed to fetch trending products",
      error: error
    };
  }
};

export const getProductByTypes=async(productType:string)=>{
   try {
    if(productType){
    const product = await prisma.product.findMany({
      where:{productType}
    })
    if(product){
       return {
        success:true,
        message:"product retrieved successfully",
        data:product
       }

    }
  }
   } catch (error) {
     return {
      success:false,
      message:"failed to retrieve product",
      error
     }
   }
}