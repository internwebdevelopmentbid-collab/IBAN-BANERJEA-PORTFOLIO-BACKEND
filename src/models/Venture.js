import mongoose from "mongoose";

const ventureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logo: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
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
    includeInArchives: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

ventureSchema.index({ order: 1, createdAt: 1 });

const Venture = mongoose.model("Venture", ventureSchema);

export default Venture;
