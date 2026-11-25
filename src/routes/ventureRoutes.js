import express from "express";

import {
  getVentures,
  getAllVentures,
  createVenture,
  updateVenture,
  reorderVentures,
  deleteVenture,
} from "../controllers/ventureController.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/", getVentures);

router.get("/admin", authMiddleware, getAllVentures);

router.patch("/reorder", authMiddleware, reorderVentures);

router.post("/", authMiddleware, upload.single("image"), createVenture);

router.put("/:id", authMiddleware, upload.single("image"), updateVenture);

router.delete("/:id", authMiddleware, deleteVenture);

export default router;
