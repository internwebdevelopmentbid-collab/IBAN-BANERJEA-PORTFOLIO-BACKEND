import mongoose from "mongoose";

const companyArchiveSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ventureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venture",
      default: null,
      unique: true,
      sparse: true,
    },
    logo: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

companyArchiveSectionSchema.index({ isActive: 1, order: 1 });

const CompanyArchiveSection = mongoose.model(
  "CompanyArchiveSection",
  companyArchiveSectionSchema,
);

export default CompanyArchiveSection;
