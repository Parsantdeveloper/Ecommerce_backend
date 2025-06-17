import express, { Request, Response, NextFunction } from "express";
import {
  createCategoryType,
  updateCategoryType,
  deleteCategoryType,
  getAllCategoryTypes,
  getCategoryTypeById,
  searchCategoryTypes,
  CreateCategoryTypeInput,
  UpdateCategoryTypeInput,
} from "../services/categoryTypeService";
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

// Create category type validation
const createCategoryTypeValidation = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
];

// Update category type validation
const updateCategoryTypeValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid category type ID"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
];

// ID parameter validation
const idValidation = [
  param("id").isInt({ min: 1 }).withMessage("Invalid category type ID"),
];

// Search validation
const searchValidation = [
  query("q")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Search query is required"),
];

/**
 * @route POST /category-types
 * @desc Create a new category type
 * @access Public
 */
router.post(
  "/",
  createCategoryTypeValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.body;

      const input: CreateCategoryTypeInput = {
        name,
      };

      const result = await createCategoryType(input);

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
      console.error("Error in POST /category-types:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route GET /category-types
 * @desc Get all category types
 * @access Public
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const includeCategoryCount = req.query.includeCategoryCount === "true";
    const result = await getAllCategoryTypes(includeCategoryCount);

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
    console.error("Error in GET /category-types:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * @route GET /category-types/search
 * @desc Search category types by name
 * @access Public
 */
router.get(
  "/search",
  searchValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string;
      const result = await searchCategoryTypes(query);

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
      console.error("Error in GET /category-types/search:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route GET /category-types/:id
 * @desc Get category type by ID
 * @access Public
 */
router.get(
  "/:id",
  idValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await getCategoryTypeById(id);

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
      console.error("Error in GET /category-types/:id:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route PUT /category-types/:id
 * @desc Update category type by ID
 * @access Public
 */
router.put(
  "/:id",
  updateCategoryTypeValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;

      const input: UpdateCategoryTypeInput = {};
      if (name !== undefined) input.name = name;

      const result = await updateCategoryType(id, input);

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
      console.error("Error in PUT /category-types/:id:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route DELETE /category-types/:id
 * @desc Delete category type by ID
 * @access Public
 */
router.delete(
  "/:id",
  idValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await deleteCategoryType(id);

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
      console.error("Error in DELETE /category-types/:id:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;