import mongoose from "mongoose";

const portfolioStatementSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["corporate", "artist"],
      required: true,
      unique: true,
      trim: true,
    },

    statement: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  },
);

const PortfolioStatement = mongoose.model(
  "PortfolioStatement",
  portfolioStatementSchema,
);

export default PortfolioStatement;
