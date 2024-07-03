import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const exists = await Video.exists({ _id: videoId });

  if (!exists) {
    throw new ApiError(404, "No such video Exists");
  }

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $skip: (page - 1) * 10,
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments retrived Successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const exists = await Video.exists({ _id: videoId });

  if (!exists) {
    throw new ApiError(404, "No such video Exists");
  }

  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content for comment is required");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(500, "Something went wrong while adding the comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, comment, "Comment uploaded Successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "No Such comment exists");
  }
  console.log(comment)
  if (req.user._id.toString() !== comment.owner.toString()) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { content } = req.body;

  comment.content = content;

  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(201, comment, "Comment is editted"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "No Such comment exists");
  }

  if (req.user._id.toString() !== comment.owner.toString()) {
    throw new ApiError(401, "Unauthorized request");
  }

  const result = await Comment.deleteOne(
    new mongoose.Types.ObjectId(commentId)
  );

  if (!result) {
    throw new ApiError(500, "Something went wrong while deleting comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, result, "Comment has been deleted"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
