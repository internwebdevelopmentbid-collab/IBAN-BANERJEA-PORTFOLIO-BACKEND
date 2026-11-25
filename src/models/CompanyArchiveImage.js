import mongoose from "mongoose";

const companyArchiveImageSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyArchiveSection",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

companyArchiveImageSchema.index({ sectionId: 1, order: 1 });

const CompanyArchiveImage = mongoose.model(
  "CompanyArchiveImage",
  companyArchiveImageSchema,
);

export default CompanyArchiveImage;
