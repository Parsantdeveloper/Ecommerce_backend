import { prisma } from "../utils/prisma";

export interface CreateCategoryTypeInput {
  name: string;
}

export interface UpdateCategoryTypeInput {
  name?: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const createCategoryType = async (input: CreateCategoryTypeInput): Promise<ServiceResponse> => {
  try {
    const { name } = input;

    if (!name || name.trim() === "") {
      return {
        success: false,
        message: "Category type name is required",
      };
    }

    // Check if category type with same name already exists
    const existingCategoryType = await prisma.categoryType.findUnique({
      where: { name: name.trim() },
    });

    if (existingCategoryType) {
      return {
        success: false,
        message: "Category type with this name already exists",
      };
    }

    const categoryType = await prisma.categoryType.create({
      data: {
        name: name.trim(),
      },
      include: {
        _count: {
          select: { categories: true },
        },
      },
    });

    return {
      success: true,
      message: "Category type created successfully",
      data: categoryType,
    };
  } catch (error) {
    console.error("Error creating category type:", error);
    return {
      success: false,
      message: "Failed to create category type",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const updateCategoryType = async (id: number, input: UpdateCategoryTypeInput): Promise<ServiceResponse> => {
  try {
    if (!id || id <= 0) {
      return {
        success: false,
        message: "Invalid category type ID",
      };
    }

    // Check if category type exists
    const existingCategoryType = await prisma.categoryType.findUnique({
      where: { id },
    });

    if (!existingCategoryType) {
      return {
        success: false,
        message: "Category type not found",
      };
    }

    const { name } = input;

    // If name is being updated, check for uniqueness
    if (name && name.trim() !== existingCategoryType.name) {
      const nameExists = await prisma.categoryType.findUnique({
        where: { name: name.trim() },
      });

      if (nameExists) {
        return {
          success: false,
          message: "Category type with this name already exists",
        };
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();

    const updatedCategoryType = await prisma.categoryType.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { categories: true },
        },
      },
    });

    return {
      success: true,
      message: "Category type updated successfully",
      data: updatedCategoryType,
    };
  } catch (error) {
    console.error("Error updating category type:", error);
    return {
      success: false,
      message: "Failed to update category type",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deleteCategoryType = async (id: number): Promise<ServiceResponse> => {
  try {
    if (!id || id <= 0) {
      return {
        success: false,
        message: "Invalid category type ID",
      };
    }

    // Check if category type exists
    const existingCategoryType = await prisma.categoryType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { categories: true },
        },
      },
    });

    if (!existingCategoryType) {
      return {
        success: false,
        message: "Category type not found",
      };
    }

    // Check if category type has categories
    if (existingCategoryType._count.categories > 0) {
      return {
        success: false,
        message: "Cannot delete category type with associated categories",
      };
    }

    const deletedCategoryType = await prisma.categoryType.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Category type deleted successfully",
      data: deletedCategoryType,
    };
  } catch (error) {
    console.error("Error deleting category type:", error);
    return {
      success: false,
      message: "Failed to delete category type",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getAllCategoryTypes = async (includeCategoryCount = false): Promise<ServiceResponse> => {
  try {
    const categoryTypes = await prisma.categoryType.findMany({
      include: {
        categories:{
          select:{
            id:true,
            name:true,
            image:true
          }
        },
        ...(includeCategoryCount && {
          _count: {
            select: { categories: true },
          },
        }),
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      message: "Category types fetched successfully",
      data: categoryTypes,
    };
  } catch (error) {
    console.error("Error fetching category types:", error);
    return {
      success: false,
      message: "Failed to fetch category types",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getCategoryTypeById = async (id: number): Promise<ServiceResponse> => {
  try {
    if (!id || id <= 0) {
      return {
        success: false,
        message: "Invalid category type ID",
      };
    }

    const categoryType = await prisma.categoryType.findUnique({
      where: { id },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            image: true,
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { categories: true },
        },
      },
    });

    if (!categoryType) {
      return {
        success: false,
        message: "Category type not found",
      };
    }

    return {
      success: true,
      message: "Category type fetched successfully",
      data: categoryType,
    };
  } catch (error) {
    console.error("Error fetching category type:", error);
    return {
      success: false,
      message: "Failed to fetch category type",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const searchCategoryTypes = async (query: string): Promise<ServiceResponse> => {
  try {
    if (!query || query.trim() === "") {
      return {
        success: false,
        message: "Search query is required",
      };
    }

    const categoryTypes = await prisma.categoryType.findMany({
      where: {
        name: {
          contains: query.trim(),
          mode: 'insensitive',
        },
      },
      include: {
        _count: {
          select: { categories: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      message: "Category types searched successfully",
      data: categoryTypes,
    };
  } catch (error) {
    console.error("Error searching category types:", error);
    return {
      success: false,
      message: "Failed to search category types",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};