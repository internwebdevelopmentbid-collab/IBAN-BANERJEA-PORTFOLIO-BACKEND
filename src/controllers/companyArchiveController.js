import mongoose from "mongoose";

import CompanyArchiveSection from "../models/CompanyArchiveSection.js";
import CompanyArchiveImage from "../models/CompanyArchiveImage.js";

import { uploadImage, deleteImage } from "../services/cloudinaryService.js";

/* -------------------------------------------------------------------------- */
/* GET PUBLIC COMPANY ARCHIVES                                                 */
/* GET /api/company-archives                                                  */
/* -------------------------------------------------------------------------- */

const getPublicArchives = async (req, res, next) => {
  try {
    const sections = await CompanyArchiveSection.find({
      isActive: true,
    })
      .populate({
        path: "ventureId",
        select: "name logo url isActive includeInArchives",
      })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Keep custom sections.
    // Venture sections are shown only when the linked venture is active
    // and included in Company Archives.
    const visibleSections = sections.filter((section) => {
      if (section.isCustom) {
        return true;
      }

      const venture = section.ventureId;

      return Boolean(
        venture &&
        venture.isActive !== false &&
        venture.includeInArchives !== false,
      );
    });

    const sectionIds = visibleSections.map((section) => section._id);

    const images = sectionIds.length
      ? await CompanyArchiveImage.find({
          sectionId: { $in: sectionIds },
        })
          .sort({ order: 1, createdAt: 1 })
          .lean()
      : [];

    const result = visibleSections.map((section) => {
      const venture =
        section.ventureId && typeof section.ventureId === "object"
          ? section.ventureId
          : null;

      const sectionImages = images.filter(
        (image) => image.sectionId.toString() === section._id.toString(),
      );

      return {
        ...section,

        // Venture-linked sections use the latest venture details.
        // Custom sections use their own saved section details.
        name: venture?.name || section.name || "",
        logo: venture?.logo || section.logo || "",
        url: venture?.url || section.url || "",

        images: sectionImages,
      };
    });

    return res.status(200).json({
      success: true,
      sections: result,
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* GET ADMIN COMPANY ARCHIVES                                                  */
/* GET /api/company-archives/admin                                            */
/* -------------------------------------------------------------------------- */

const getAdminArchives = async (req, res, next) => {
  try {
    const sections = await CompanyArchiveSection.find()
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const sectionIds = sections.map((section) => section._id);

    const images = sectionIds.length
      ? await CompanyArchiveImage.find({
          sectionId: { $in: sectionIds },
        })
          .sort({ order: 1, createdAt: 1 })
          .lean()
      : [];

    return res.status(200).json({
      success: true,
      sections: sections.map((section) => ({
        ...section,
        images: images.filter(
          (image) => image.sectionId.toString() === section._id.toString(),
        ),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* CREATE CUSTOM ARCHIVE SECTION                                               */
/* POST /api/company-archives/sections                                        */
/* -------------------------------------------------------------------------- */

const createArchiveSection = async (req, res, next) => {
  try {
    const name = req.body?.name?.trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Section name is required",
      });
    }

    const lastSection = await CompanyArchiveSection.findOne()
      .sort({ order: -1 })
      .select("order")
      .lean();

    const section = await CompanyArchiveSection.create({
      name,
      order: lastSection ? lastSection.order + 1 : 0,
      isCustom: true,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Archive section created successfully",
      section,
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* UPDATE CUSTOM ARCHIVE SECTION                                               */
/* PUT /api/company-archives/sections/:sectionId                              */
/* -------------------------------------------------------------------------- */

const updateArchiveSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid archive section ID",
      });
    }

    const section = await CompanyArchiveSection.findById(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Archive section not found",
      });
    }

    if (!section.isCustom) {
      return res.status(400).json({
        success: false,
        message: "Venture sections are managed through Ventures",
      });
    }

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string") {
        return res.status(400).json({
          success: false,
          message: "Section name must be a string",
        });
      }

      const name = req.body.name.trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Section name is required",
        });
      }

      section.name = name;
    }

    await section.save();

    return res.status(200).json({
      success: true,
      message: "Archive section updated successfully",
      section,
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* DELETE CUSTOM ARCHIVE SECTION                                               */
/* DELETE /api/company-archives/sections/:sectionId                           */
/* -------------------------------------------------------------------------- */

const deleteArchiveSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid archive section ID",
      });
    }

    const section = await CompanyArchiveSection.findById(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Archive section not found",
      });
    }

    if (!section.isCustom) {
      return res.status(400).json({
        success: false,
        message: "Venture sections are managed through Ventures",
      });
    }

    const images = await CompanyArchiveImage.find({
      sectionId,
    }).lean();

    await CompanyArchiveImage.deleteMany({ sectionId });

    await CompanyArchiveSection.deleteOne({
      _id: sectionId,
    });

    await Promise.allSettled(
      images.map((image) => deleteImage(image.publicId)),
    );

    return res.status(200).json({
      success: true,
      message: "Archive section deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* UPLOAD ARCHIVE IMAGES                                                       */
/* POST /api/company-archives/sections/:sectionId/images                      */
/* -------------------------------------------------------------------------- */

const uploadArchiveImages = async (req, res, next) => {
  const uploadedImages = [];

  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid archive section ID",
      });
    }

    const section = await CompanyArchiveSection.findById(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Archive section not found",
      });
    }

    if (!req.files?.length) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    const lastImage = await CompanyArchiveImage.findOne({
      sectionId,
    })
      .sort({ order: -1 })
      .select("order")
      .lean();

    const startingOrder = lastImage ? lastImage.order + 1 : 0;

    const cloudinaryImages = await Promise.all(
      req.files.map(async (file) => {
        const uploaded = await uploadImage(
          file,
          `portfolio/company-archives/${sectionId}`,
        );

        uploadedImages.push(uploaded);

        return uploaded;
      }),
    );

    const documents = cloudinaryImages.map((uploaded, index) => ({
      sectionId,
      url: uploaded.url,
      publicId: uploaded.publicId,
      order: startingOrder + index,
    }));

    const images = await CompanyArchiveImage.insertMany(documents);

    return res.status(201).json({
      success: true,
      message: `${images.length} archive images uploaded successfully`,
      images,
    });
  } catch (error) {
    await Promise.allSettled(
      uploadedImages.map((image) => deleteImage(image.publicId)),
    );

    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* DELETE ARCHIVE IMAGE                                                        */
/* DELETE /api/company-archives/sections/:sectionId/images/:imageId           */
/* -------------------------------------------------------------------------- */

const deleteArchiveImage = async (req, res, next) => {
  try {
    const { sectionId, imageId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(sectionId) ||
      !mongoose.Types.ObjectId.isValid(imageId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid section or image ID",
      });
    }

    const image = await CompanyArchiveImage.findOne({
      _id: imageId,
      sectionId,
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Archive image not found",
      });
    }

    await CompanyArchiveImage.deleteOne({
      _id: image._id,
    });

    try {
      await deleteImage(image.publicId);
    } catch (error) {
      console.error("Archive image cleanup failed:", error.message);
    }

    const remaining = await CompanyArchiveImage.find({
      sectionId,
    }).sort({ order: 1 });

    await Promise.all(
      remaining.map((item, index) =>
        CompanyArchiveImage.updateOne(
          { _id: item._id },
          { $set: { order: index } },
        ),
      ),
    );

    return res.status(200).json({
      success: true,
      message: "Archive image deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* REORDER ARCHIVE IMAGES                                                      */
/* PATCH /api/company-archives/sections/:sectionId/reorder                    */
/* -------------------------------------------------------------------------- */

const reorderArchiveImages = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { imageIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid archive section ID",
      });
    }

    if (
      !Array.isArray(imageIds) ||
      imageIds.some((id) => !mongoose.Types.ObjectId.isValid(id)) ||
      new Set(imageIds).size !== imageIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid image order",
      });
    }

    const existing = await CompanyArchiveImage.find({
      sectionId,
    }).select("_id");

    const existingIds = new Set(existing.map((item) => item._id.toString()));

    if (
      existingIds.size !== imageIds.length ||
      imageIds.some((id) => !existingIds.has(id))
    ) {
      return res.status(400).json({
        success: false,
        message: "The supplied image order does not match this section",
      });
    }

    await Promise.all(
      imageIds.map((id, index) =>
        CompanyArchiveImage.updateOne(
          { _id: id, sectionId },
          { $set: { order: index } },
        ),
      ),
    );

    return res.status(200).json({
      success: true,
      message: "Archive image order updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* REORDER ARCHIVE SECTIONS                                                    */
/* PATCH /api/company-archives/sections/reorder                               */
/* -------------------------------------------------------------------------- */

const reorderArchiveSections = async (req, res, next) => {
  try {
    const { sectionIds } = req.body;

    if (
      !Array.isArray(sectionIds) ||
      sectionIds.some((id) => !mongoose.Types.ObjectId.isValid(id)) ||
      new Set(sectionIds).size !== sectionIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid archive section order",
      });
    }

    const existing = await CompanyArchiveSection.find().select("_id");

    const existingIds = new Set(existing.map((item) => item._id.toString()));

    if (
      existingIds.size !== sectionIds.length ||
      sectionIds.some((id) => !existingIds.has(id))
    ) {
      return res.status(400).json({
        success: false,
        message: "The supplied order does not match the archive sections",
      });
    }

    await Promise.all(
      sectionIds.map((id, index) =>
        CompanyArchiveSection.updateOne(
          { _id: id },
          { $set: { order: index } },
        ),
      ),
    );

    return res.status(200).json({
      success: true,
      message: "Archive section order updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/* EXPORTS                                                                     */
/* -------------------------------------------------------------------------- */

export {
  getPublicArchives,
  getAdminArchives,
  createArchiveSection,
  updateArchiveSection,
  deleteArchiveSection,
  uploadArchiveImages,
  deleteArchiveImage,
  reorderArchiveImages,
  reorderArchiveSections,
};
