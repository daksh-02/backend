import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const userId = req.user._id;

  const exists = await Video.exists({ _id: videoId });

  if (!exists) {
    throw new ApiError(404, "No such video exists");
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const aggregateQuery = [
    {
      $match: { video: new mongoose.Types.ObjectId(videoId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },

    {
      $project: {
        content: 1,
        video: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: 1,
        ownerDetails: {
          username: "$ownerDetails.username",
          avatar: "$ownerDetails.avatar",
          fullname: "$ownerDetails.fullName",
        },
      },
    },
  ];

  const commentsResult = await Comment.aggregatePaginate(
    Comment.aggregate(aggregateQuery),
    options
  );

  const comments = await Promise.all(
    commentsResult.docs.map(async (comment) => {
      const likeCount = await Like.countDocuments({ comment: comment._id });
      const isLiked = await Like.exists({
        comment: comment._id,
        likedBy: userId,
      });

      return {
        ...comment,
        likeCount,
        isLiked: Boolean(isLiked),
      };
    })
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        totalPages: commentsResult.totalPages,
        totalDocs: commentsResult.totalDocs,
        page: commentsResult.page,
        limit: commentsResult.limit,
      },
      "Comments retrieved successfully"
    )
  );
});
const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;

  const user = await User.findById(req.user._id);

  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content for comment is required");
  }

  let comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(500, "Something went wrong while adding the comment");
  }
  comment = comment.toObject();

  // Add new properties
  comment.likeCount = 0;
  comment.isLiked = false;
  comment.ownerDetails = {
    username: user.username,
    avatar: user.avatar,
    fullname: user.fullName,
  };

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
  console.log(comment);
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
