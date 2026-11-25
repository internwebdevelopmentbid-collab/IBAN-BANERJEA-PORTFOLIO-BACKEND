import express from "express";

import {
  getPortfolioImages,
  updatePortfolioStatement,
  uploadPortfolioImage,
  deletePortfolioImage,
} from "../controllers/portfolioController.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// PUBLIC ROUTE

router.get("/:section", getPortfolioImages);

// ADMIN ROUTE - UPDATE APPROACH TEXT

router.put("/:section/statement", authMiddleware, updatePortfolioStatement);

// ADMIN ROUTE - UPLOAD OR REPLACE PORTFOLIO IMAGE

router.post(
  "/:section/:slot",
  authMiddleware,
  upload.single("image"),
  uploadPortfolioImage,
);

// ADMIN ROUTE - DELETE PORTFOLIO IMAGE

router.delete("/:section/:slot", authMiddleware, deletePortfolioImage);

export default router;
