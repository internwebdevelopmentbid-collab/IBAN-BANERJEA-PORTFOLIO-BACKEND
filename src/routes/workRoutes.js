import express from "express";

import {
  getWorks,
  getAllWorks,
  createWork,
  updateWork,
  reorderWorks,
  deleteWork,
} from "../controllers/workController.js";

import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", getWorks);

// Admin protected
router.get("/admin", authMiddleware, getAllWorks);
router.post("/", authMiddleware, createWork);
router.patch("/reorder", authMiddleware, reorderWorks);
router.put("/:id", authMiddleware, updateWork);
router.delete("/:id", authMiddleware, deleteWork);

export default router;
