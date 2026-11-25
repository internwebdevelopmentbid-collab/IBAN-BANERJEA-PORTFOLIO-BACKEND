import Work from "../models/Work.js";

const getYouTubeVideoId = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const input = value.trim();

  // Direct YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);

    const hostname = url.hostname.replace(/^www\./, "");

    if (
      hostname === "youtu.be" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      let videoId = null;

      if (hostname === "youtu.be") {
        videoId = url.pathname.split("/")[1];
      } else if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else {
        const match = url.pathname.match(
          /^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/,
        );

        videoId = match?.[1] || null;
      }

      return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null;
    }

    return null;
  } catch {
    return null;
  }
};

// GET /api/works
// Public: get active embedded works
export const getWorks = async (req, res) => {
  try {
    const works = await Work.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .select("title videoId order");

    return res.status(200).json({
      success: true,
      count: works.length,
      works,
    });
  } catch (error) {
    console.error("Get works error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch works.",
    });
  }
};

// GET /api/works/admin
// Admin: get all works
export const getAllWorks = async (req, res) => {
  try {
    const works = await Work.find().sort({
      order: 1,
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      count: works.length,
      works,
    });
  } catch (error) {
    console.error("Get all works error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch works.",
    });
  }
};

// POST /api/works
// Admin: create a work
export const createWork = async (req, res) => {
  try {
    const { title, videoId, order } = req.body;

    const normalizedVideoId = getYouTubeVideoId(videoId);

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Work title is required.",
      });
    }

    if (!normalizedVideoId) {
      return res.status(400).json({
        success: false,
        message: "A valid YouTube video ID or URL is required.",
      });
    }

    if (order !== undefined && !Number.isFinite(Number(order))) {
      return res.status(400).json({
        success: false,
        message: "Order must be a valid number.",
      });
    }

    const work = await Work.create({
      title: title.trim(),
      videoId: normalizedVideoId,
      order: order === undefined ? 0 : Number(order),
    });

    return res.status(201).json({
      success: true,
      message: "Work added successfully.",
      work,
    });
  } catch (error) {
    console.error("Create work error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add work.",
    });
  }
};

// PUT /api/works/:id
// Admin: update a work
export const updateWork = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, videoId, order, isActive } = req.body;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid work ID.",
      });
    }

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Work title cannot be empty.",
        });
      }

      updates.title = title.trim();
    }

    if (videoId !== undefined) {
      const normalizedVideoId = getYouTubeVideoId(videoId);

      if (!normalizedVideoId) {
        return res.status(400).json({
          success: false,
          message: "A valid YouTube video ID or URL is required.",
        });
      }

      updates.videoId = normalizedVideoId;
    }

    if (order !== undefined) {
      if (!Number.isFinite(Number(order))) {
        return res.status(400).json({
          success: false,
          message: "Order must be a valid number.",
        });
      }

      updates.order = Number(order);
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be a boolean.",
        });
      }

      updates.isActive = isActive;
    }

    const work = await Work.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!work) {
      return res.status(404).json({
        success: false,
        message: "Work not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Work updated successfully.",
      work,
    });
  } catch (error) {
    console.error("Update work error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update work.",
    });
  }
};

// PATCH /api/works/reorder
// Admin: update display order
export const reorderWorks = async (req, res) => {
  try {
    const { workIds } = req.body;

    if (!Array.isArray(workIds)) {
      return res.status(400).json({
        success: false,
        message: "workIds must be an array.",
      });
    }

    const uniqueIds = new Set(workIds);

    if (
      uniqueIds.size !== workIds.length ||
      workIds.some(
        (id) => typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or duplicate work IDs.",
      });
    }

    const existingCount = await Work.countDocuments({
      _id: { $in: workIds },
    });

    if (existingCount !== workIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more works were not found.",
      });
    }

    await Work.bulkWrite(
      workIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: index } },
        },
      })),
    );

    return res.status(200).json({
      success: true,
      message: "Works reordered successfully.",
    });
  } catch (error) {
    console.error("Reorder works error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reorder works.",
    });
  }
};

// DELETE /api/works/:id
// Admin: delete a work
export const deleteWork = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid work ID.",
      });
    }

    const work = await Work.findByIdAndDelete(id);

    if (!work) {
      return res.status(404).json({
        success: false,
        message: "Work not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Work deleted successfully.",
    });
  } catch (error) {
    console.error("Delete work error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete work.",
    });
  }
};
