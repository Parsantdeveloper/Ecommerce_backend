import { prisma } from "../utils/prisma";
import { destroy } from "../config/multer";

export interface CreateBannerInput {
  title: string;
  description: string;
  imageUrl: {
    url: string;
    public_id: string;
  };
  linkUrl: string;
  categoryId: number;
}
export interface updateBannerInput {
  title: string;
  description: string;
    isAtive: boolean;
  linkUrl: string;
  categoryId: number;

}

export const createBanner = async (input: CreateBannerInput) => {
  try {
    if (
      !input.title ||
      !input.description ||
      !input.imageUrl ||
      !input.linkUrl ||
      !input.categoryId
    ) {
      return {
        success: false,
        message: "All fields are required",
      };
    }

    console.log("Creating banner with input:", input);
    const banner = await prisma.banner.create({
      data: {
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl,
        categoryId: Number(input.categoryId),
      },
    });
    if(banner) {
      return {
        success: true,
        message: "Banner created successfully",
        data: banner,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "An error occurred while creating the banner",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getAllBanners = async () => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        category:{
         select:{
          name: true,
         }
        }
      }
      
    });
    return {
      success: true,
      data: banners,
    };
  } catch (error) {
    return {
      success: false,
      message: "An error occurred while fetching banners",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const getBannerById = async (id: number) => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id: Number(id) },
    });
    if (!banner) {
      return {
        success: false,
        message: "Banner not found",
      };
    }
    return {
      success: true,
      data: banner,
    };
  } catch (error) {
    return {
      success: false,
      message: "An error occurred while fetching the banner",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deleteBanner = async (id: number) => {
  try {
    const getbanner = await prisma.banner.findUnique({ where: { id: Number(id) } });

    if (!getbanner) {
      return {
        success: false,
        message: "Banner not found",
      };
    }

    const image:any = getbanner.imageUrl ;
    if (image?.public_id) {
      await destroy(image.public_id).catch((err) => {
        console.error("Failed to delete image from Cloudinary:", err);
      });
    }

    const banner = await prisma.banner.delete({
      where: { id: Number(id) },
    });

    return {
      success: true,
      message: "Banner deleted successfully",
      data: banner,
    };
  } catch (error) {
    return {
      success: false,
      message: "An error occurred while deleting the banner",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const updateBanner = async (id: number, input: updateBannerInput) => {
  try {
    const getbanner = await prisma.banner.findUnique({ where: { id: Number(id) } });

    if (!getbanner) {
      return {
        success: false,
        message: "Banner not found",
      };
    }
    console.log(getbanner," getbanner");
  
    const updatedBanner = await prisma.banner.update({
      where: { id: Number(id) },
      data: {
        title: input.title,
        description: input.description,
        linkUrl: input.linkUrl,
        isActive: Boolean(input.isAtive)
      },
    });

    return {
      success: true,
      message: "Banner updated successfully",
      data: updatedBanner,
    };
  } catch (error) {
    return {
      success: false,
      message: "An error occurred while updating the banner",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};