import e from "express";
import { uploadFileCloudinary } from "../config/cloudinaryConfig.js";
import Message from "../models/Message.js";
import Status from "../models/Status.js";
import response from "../utils/responseHandler.js";

export const createStatus = async (req, res) => {
  const { content, contentType } = req.body;
  const file = req.file; // Assuming you're using multer for file uploads
  const userId = req.user.userId;

  try {
    let mediaURL = null;
    const finalContentType = contentType || "text";
    if (file) {
      const uploadFile = await uploadFileCloudinary(file);

      if (!uploadFile) throw new Error("File upload failed");
      mediaURL = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Invalid file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Invalid content");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Set expiration to 24 hours from now

    const status = await Status.create({
      user: userId,
      content: mediaURL || content,
      contentType: finalContentType,
      expiresAt,
    });

    await status.save();
    const populatedStatus = await Status.findById(status._id)
      .populate("user", "userName profilePicture")
      .populate("viewers", "userName profilePicture");

    return response(res, 201, "Status created successfully", populatedStatus);
  } catch (error) {
    console.error("Error creating status:", error);
    return response(res, 500, "Internal server error");
  }
};

export const getStatuses = async (req, res) => {
  try {
    //   const userId = req.user.userId;

    const statuses = await Status.find({
      //   user: userId,
      expiresAt: { $gt: new Date() }, // Only get non-expired statuses
    })
      .populate("user", "userName profilePicture")
      .populate("viewers", "userName profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "Statuses fetched successfully", statuses);
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return response(res, 500, "Internal server error");
  }
};

export const markStatusAsViewed = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();

      const updatedStatus = await Status.findById(statusId)
        .populate("user", "userName profilePicture")
        .populate("viewers", "userName profilePicture");

      return response(res, 200, "Status marked as viewed successfully", updatedStatus);
    } else {
      console.log("Status already viewed");
    }

    return response(res, 200, "Status marked as viewed successfully", status);
  } catch (error) {
    console.error("Error marking status as viewed:", error);
    return response(res, 500, "Internal server error");
  }
};


export const deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;

  try {
    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (status.user.toString() !== userId) {
      return response(res, 403, "You are not authorized to delete this status");
    }

    await status.remove();

    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.error("Error deleting status:", error);
    return response(res, 500, "Internal server error");
  }
};