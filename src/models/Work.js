import mongoose from "mongoose";

const workSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Work title is required."],
      trim: true,
      maxlength: 150,
    },

    videoId: {
      type: String,
      required: [true, "YouTube video ID is required."],
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
  },
  {
    timestamps: true,
  },
);

workSchema.index({ order: 1, createdAt: 1 });

const Work = mongoose.model("Work", workSchema);

export default Work;
