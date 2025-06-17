import { prisma } from "../utils/prisma";

export interface CreateCategoryInput {
  name: string;
  image?: string;
  categoryTypeId?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  image?: string;
  categoryTypeId?: number;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const createCategory = async (input: CreateCategoryInput): Promise<ServiceResponse> => {
  try {
    const { name, image, categoryTypeId } = input;

    if (!name || name.trim() === "") {
      return {
        success: false,
        message: "Category name is required",
      };
    }

    // Check if category with same name already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      return {
        success: false,
        message: "Category with this name already exists",
      };
    }

    // If categoryTypeId is provided, verify it exists
    if (categoryTypeId) {
      const categoryTypeExists = await prisma.categoryType.findUnique({
        where: { id: categoryTypeId },
      });

      if (!categoryTypeExists) {
        return {
          success: false,
          message: "Invalid category type ID",
        };
      }
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        image: image || null,
        categoryTypeId: categoryTypeId || null,
      },
      include: {
        categoryType: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return {
      success: true,
      message: "Category created successfully",
      data: category,
    };
  } catch (error) {
    console.error("Error creating category:", error);
    return {
      success: false,
      message: "Failed to create category",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const updateCategory = async (id: number, input: UpdateCategoryInput): Promise<ServiceResponse> => {
  try {
    if (!id || id <= 0) {
      return {
        success: false,
        message: "Invalid category ID",
      };
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return {
        success: false,
        message: "Category not found",
      };
    }

    const { name, image, categoryTypeId } = input;

    // If name is being updated, check for uniqueness
    if (name && name.trim() !== existingCategory.name) {
      const nameExists = await prisma.category.findUnique({
        where: { name: name.trim() },
      });

      if (nameExists) {
        return {
          success: false,
          message: "Category with this name already exists",
        };
      }
    }

    // If categoryTypeId is provided, verify it exists
    if (categoryTypeId) {
      const categoryTypeExists = await prisma.categoryType.findUnique({
        where: { id: categoryTypeId },
      });

      if (!categoryTypeExists) {
        return {
          success: false,
          message: "Invalid category type ID",
        };
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (image !== undefined) updateData.image = image;
    if (categoryTypeId !== undefined) updateData.categoryTypeId = categoryTypeId;

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        categoryType: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return {
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    };
  } catch (error) {
    console.error("Error updating category:", error);
    return {
      success: false,
      message: "Failed to update category",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deleteCategory = async (id: number): Promise<ServiceResponse> => {
  try {
    if (!id || id <= 0) {
      return {
        success: false,
        message: "Invalid category ID",
      };
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existingCategory) {
      return {
        success: false,
        message: "Category not found",
      };
    }

    // Check if category has products
    if (existingCategory._count.products > 0) {
      return {
        success: false,
        message: "Cannot delete category with associated products",
      };
    }

    const deletedCategory = await prisma.category.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Category deleted successfully",
      data: deletedCategory,
    };
  } catch (error) {
    console.error("Error deleting category:", error);
    return {
      success: false,
      message: "Failed to delete category",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getAllCategories = async (includeProductCount = false): Promise<ServiceResponse> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        categoryType: true,
        ...(includeProductCount && {
          _count: {
            select: { products: true },
          },
        }),
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      message: "Failed to fetch categories",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getCategoryById = async (id: number): Promise<ServiceResponse> => {
  try {
    if (!id || id <= 0) {
      return {
        success: false,
        message: "Invalid category ID",
      };
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        categoryType: true,
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return {
        success: false,
        message: "Category not found",
      };
    }

    return {
      success: true,
      message: "Category fetched successfully",
      data: category,
    };
  } catch (error) {
    console.error("Error fetching category:", error);
    return {
      success: false,
      message: "Failed to fetch category",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getCategoriesByType = async (categoryTypeId: number): Promise<ServiceResponse> => {
  try {
    if (!categoryTypeId || categoryTypeId <= 0) {
      return {
        success: false,
        message: "Invalid category type ID",
      };
    }

    const categories = await prisma.category.findMany({
      where: { categoryTypeId },
      include: {
        categoryType: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    };
  } catch (error) {
    console.error("Error fetching categories by type:", error);
    return {
      success: false,
      message: "Failed to fetch categories",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const searchCategories = async (query: string): Promise<ServiceResponse> => {
  try {
    if (!query || query.trim() === "") {
      return {
        success: false,
        message: "Search query is required",
      };
    }

    const categories = await prisma.category.findMany({
      where: {
        name: {
          contains: query.trim(),
          mode: 'insensitive',
        },
      },
      include: {
        categoryType: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      message: "Categories searched successfully",
      data: categories,
    };
  } catch (error) {
    console.error("Error searching categories:", error);
    return {
      success: false,
      message: "Failed to search categories",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};