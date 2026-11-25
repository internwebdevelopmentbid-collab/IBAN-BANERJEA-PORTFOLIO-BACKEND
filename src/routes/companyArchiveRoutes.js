import express from "express";

import {
  getPublicArchives,
  getAdminArchives,
  createArchiveSection,
  updateArchiveSection,
  deleteArchiveSection,
  uploadArchiveImages,
  deleteArchiveImage,
  reorderArchiveImages,
  reorderArchiveSections,
} from "../controllers/companyArchiveController.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Public
router.get("/", getPublicArchives);

// Admin
router.get("/admin", authMiddleware, getAdminArchives);

router.post("/sections", authMiddleware, createArchiveSection);

router.put("/sections/:sectionId", authMiddleware, updateArchiveSection);

router.delete("/sections/:sectionId", authMiddleware, deleteArchiveSection);

router.patch("/sections/reorder", authMiddleware, reorderArchiveSections);

router.post(
  "/sections/:sectionId/images",
  authMiddleware,
  upload.array("images", 30),
  uploadArchiveImages,
);

router.patch(
  "/sections/:sectionId/reorder",
  authMiddleware,
  reorderArchiveImages,
);

router.delete(
  "/sections/:sectionId/images/:imageId",
  authMiddleware,
  deleteArchiveImage,
);

export default router;
