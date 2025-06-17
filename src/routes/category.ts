import express, { Request, Response, NextFunction } from "express";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  getCategoriesByType,
  searchCategories,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../services/categoryService";
import { upload } from "../config/multer";
import { body, param, query, validationResult } from "express-validator";

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
    return;
  }
  next();
};

// Create category validation
const createCategoryValidation = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("categoryTypeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Category type ID must be a positive integer"),
];

// Update category validation
const updateCategoryValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid category ID"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("categoryTypeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Category type ID must be a positive integer"),
];

// ID parameter validation
const idValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid category ID"),
];

// Search validation
const searchValidation = [
  query("q")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Search query is required"),
];

/**
 * @route POST /categories
 * @desc Create a new category
 * @access Public
 */
router.post(
  "/",
  upload.single("image"),
  createCategoryValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, categoryTypeId } = req.body;
      const image = req.file?.path;

      const input: CreateCategoryInput = {
        name,
        image,
        categoryTypeId: categoryTypeId ? parseInt(categoryTypeId) : undefined,
      };

      const result = await createCategory(input);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      console.error("Error in POST /categories:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route GET /categories
 * @desc Get all categories
 * @access Public
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const includeProductCount = req.query.includeProductCount === "true";
    const result = await getAllCategories(includeProductCount);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
        count: result.data?.length || 0,
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: result.message,
      error: result.error,
    });
  } catch (error) {
    console.error("Error in GET /categories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * @route GET /categories/search
 * @desc Search categories by name
 * @access Public
 */
router.get(
  "/search",
  searchValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string;
      const result = await searchCategories(query);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
          count: result.data?.length || 0,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      console.error("Error in GET /categories/search:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route GET /categories/type/:typeId
 * @desc Get categories by category type
 * @access Public
 */
router.get(
  "/type/:typeId",
  [param("typeId").isInt({ min: 1 }).withMessage("Invalid category type ID")],
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const typeId = parseInt(req.params.typeId);
      const result = await getCategoriesByType(typeId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
          count: result.data?.length || 0,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      console.error("Error in GET /categories/type/:typeId:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route GET /categories/:id
 * @desc Get category by ID
 * @access Public
 */
router.get(
  "/:id",
  idValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await getCategoryById(id);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
        });
        return;
      }

      res.status(404).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      console.error("Error in GET /categories/:id:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route PUT /categories/:id
 * @desc Update category by ID
 * @access Public
 */
router.put(
  "/:id",
  upload.single("image"),
  updateCategoryValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { name, categoryTypeId } = req.body;
      const image = req.file?.path;

      const input: UpdateCategoryInput = {};
      if (name !== undefined) input.name = name;
      if (image !== undefined) input.image = image;
      if (categoryTypeId !== undefined) input.categoryTypeId = parseInt(categoryTypeId);

      const result = await updateCategory(id, input);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      console.error("Error in PUT /categories/:id:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route DELETE /categories/:id
 * @desc Delete category by ID
 * @access Public
 */
router.delete(
  "/:id",
  idValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await deleteCategory(id);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    } catch (error) {
      console.error("Error in DELETE /categories/:id:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;