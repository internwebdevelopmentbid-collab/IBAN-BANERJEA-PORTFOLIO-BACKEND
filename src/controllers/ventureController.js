import mongoose from "mongoose";

import Venture from "../models/Venture.js";
import CompanyArchiveSection from "../models/CompanyArchiveSection.js";
import CompanyArchiveImage from "../models/CompanyArchiveImage.js";

import { uploadImage, deleteImage } from "../services/cloudinaryService.js";

const syncVentureArchive = async (venture) => {
  const shouldInclude = venture.isActive && venture.includeInArchives !== false;

  if (!shouldInclude) {
    const section = await CompanyArchiveSection.findOne({
      ventureId: venture._id,
    });

    if (section) {
      const images = await CompanyArchiveImage.find({
        sectionId: section._id,
      }).lean();

      await CompanyArchiveImage.deleteMany({
        sectionId: section._id,
      });

      await CompanyArchiveSection.deleteOne({
        _id: section._id,
      });

      await Promise.allSettled(
        images.map((image) => deleteImage(image.publicId)),
      );
    }

    return;
  }

  const existing = await CompanyArchiveSection.findOne({
    ventureId: venture._id,
  });

  const sectionData = {
    name: venture.name,
    logo: venture.logo,
    url: venture.url,
    isActive: true,
    isCustom: false,
  };

  if (existing) {
    await CompanyArchiveSection.updateOne(
      { _id: existing._id },
      { $set: sectionData },
    );
  } else {
    const lastSection = await CompanyArchiveSection.findOne()
      .sort({ order: -1 })
      .select("order")
      .lean();

    await CompanyArchiveSection.create({
      ...sectionData,
      ventureId: venture._id,
      order: lastSection ? lastSection.order + 1 : 0,
    });
  }
};

const getVentures = async (req, res, next) => {
  try {
    const ventures = await Venture.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .select("name logo url order isActive includeInArchives")
      .lean();

    return res.status(200).json({
      success: true,
      count: ventures.length,
      ventures,
    });
  } catch (error) {
    next(error);
  }
};

const getAllVentures = async (req, res, next) => {
  try {
    const ventures = await Venture.find()
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: ventures.length,
      ventures,
    });
  } catch (error) {
    next(error);
  }
};

const createVenture = async (req, res, next) => {
  let uploaded;

  try {
    const name = req.body?.name?.trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Venture name is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Venture logo is required",
      });
    }

    const { url = "", order } = req.body;

    uploaded = await uploadImage(req.file, "portfolio/ventures");

    const venture = await Venture.create({
      name,
      logo: uploaded.url,
      publicId: uploaded.publicId,
      url: url.trim(),
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      includeInArchives:
        req.body.includeInArchives === undefined ||
        req.body.includeInArchives === "true",
    });

    await syncVentureArchive(venture);

    return res.status(201).json({
      success: true,
      message: "Venture created successfully",
      venture,
    });
  } catch (error) {
    if (uploaded?.publicId) {
      await deleteImage(uploaded.publicId).catch(() => {});
    }

    next(error);
  }
};

const updateVenture = async (req, res, next) => {
  let uploaded;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid venture ID",
      });
    }

    const venture = await Venture.findById(id);

    if (!venture) {
      return res.status(404).json({
        success: false,
        message: "Venture not found",
      });
    }

    const oldPublicId = venture.publicId;

    if (req.file) {
      uploaded = await uploadImage(req.file, "portfolio/ventures");
      venture.logo = uploaded.url;
      venture.publicId = uploaded.publicId;
    }

    if (req.body.name !== undefined) {
      const name = req.body.name.trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Venture name is required",
        });
      }

      venture.name = name;
    }

    if (req.body.url !== undefined) {
      venture.url = req.body.url.trim();
    }

    if (req.body.order !== undefined) {
      venture.order = Number(req.body.order);
    }

    if (req.body.isActive !== undefined) {
      venture.isActive =
        req.body.isActive === true || req.body.isActive === "true";
    }

    if (req.body.includeInArchives !== undefined) {
      venture.includeInArchives =
        req.body.includeInArchives === true ||
        req.body.includeInArchives === "true";
    }

    await venture.save();

    await syncVentureArchive(venture);

    if (uploaded && oldPublicId) {
      await deleteImage(oldPublicId).catch((error) => {
        console.error("Old venture logo cleanup failed:", error.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Venture updated successfully",
      venture,
    });
  } catch (error) {
    if (uploaded?.publicId) {
      await deleteImage(uploaded.publicId).catch(() => {});
    }

    next(error);
  }
};

const reorderVentures = async (req, res, next) => {
  try {
    const { ventureIds } = req.body;

    if (
      !Array.isArray(ventureIds) ||
      ventureIds.some((id) => !mongoose.Types.ObjectId.isValid(id)) ||
      new Set(ventureIds).size !== ventureIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid venture order",
      });
    }

    const existingCount = await Venture.countDocuments({
      _id: { $in: ventureIds },
    });

    if (existingCount !== ventureIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more ventures were not found",
      });
    }

    await Promise.all(
      ventureIds.map((id, index) =>
        Venture.updateOne({ _id: id }, { $set: { order: index } }),
      ),
    );

    return res.status(200).json({
      success: true,
      message: "Ventures reordered successfully",
    });
  } catch (error) {
    next(error);
  }
};

const deleteVenture = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid venture ID",
      });
    }

    const venture = await Venture.findById(id);

    if (!venture) {
      return res.status(404).json({
        success: false,
        message: "Venture not found",
      });
    }

    await syncVentureArchive({
      ...venture.toObject(),
      isActive: false,
    });

    await Venture.deleteOne({ _id: venture._id });

    if (venture.publicId) {
      await deleteImage(venture.publicId).catch((error) => {
        console.error("Venture logo cleanup failed:", error.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Venture deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export {
  getVentures,
  getAllVentures,
  createVenture,
  updateVenture,
  reorderVentures,
  deleteVenture,
};
