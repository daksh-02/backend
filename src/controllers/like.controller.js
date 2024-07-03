import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  const likeOnVideo = await Like.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
  ]);

  if (likeOnVideo.length > 0) {
    const like = likeOnVideo[0];
    const result = await Like.deleteOne(new mongoose.Types.ObjectId(like._id));

    if (!result) {
      throw new ApiError(500, "Somthing went wrong");
    }

    return res.status(200).json(new ApiResponse(201, result, "Like Removed"));
  }

  const like = await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });

  if (!like) {
    throw new ApiError(500, "Something went Wrong");
  }

  return res.status(200).json(new ApiResponse(201, like, "Like Added"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  const likeOnComment = await Like.aggregate([
    {
      $match: {
        comment: new mongoose.Types.ObjectId(commentId),
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
  ]);

  if (likeOnComment.length > 0) {
    const like = likeOnComment[0];
    const result = await Like.deleteOne(new mongoose.Types.ObjectId(like._id));

    if (!result) {
      throw new ApiError(500, "Somthing went wrong");
    }

    return res.status(200).json(new ApiResponse(201, result, "Like Removed"));
  }

  const like = await Like.create({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (!like) {
    throw new ApiError(500, "Something went Wrong");
  }

  return res.status(200).json(new ApiResponse(201, like, "Like Added"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  const likeOnTweet = await Like.aggregate([
    {
      $match: {
        tweet: new mongoose.Types.ObjectId(tweetId),
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
  ]);

  if (likeOnTweet.length > 0) {
    const like = likeOnTweet[0];
    const result = await Like.deleteOne(new mongoose.Types.ObjectId(like._id));

    if (!result) {
      throw new ApiError(500, "Somthing went wrong");
    }

    return res.status(200).json(new ApiResponse(201, result, "Like Removed"));
  }

  const like = await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (!like) {
    throw new ApiError(500, "Something went Wrong");
  }

  return res.status(200).json(new ApiResponse(201, like, "Like Added"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
  ]);

  if (!likedVideos) {
    throw new ApiError(500, "Something went wrong");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "List of liked Videos"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
