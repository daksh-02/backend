import mongoose, { Mongoose, isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { Like } from "../models/like.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const {
    page = 1,
    limit = 8,
    sortType = "ascending",
    isOwnProfile,
  } = req.query;

  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userId = user._id;

  // Determine the match criteria based on the `isOwnProfile` flag
  const matchCriteria = {
    owner: new mongoose.Types.ObjectId(userId),
  };

  if (!isOwnProfile) {
    matchCriteria.isPublished = true;
  }

  const videos = await Video.aggregate([
    {
      $match: matchCriteria,
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: (page - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  const totalVideos = await Video.countDocuments(matchCriteria);

  if (!videos) {
    throw new ApiError(404, "No videos found");
  }

  const nextPage = page * limit < totalVideos ? parseInt(page) + 1 : null;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos, length: videos.length, nextPage },
        "Videos fetched successfully"
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, videoFile, thumbNail } = req.body;
  // TODO: get video, upload to cloudinary, create video

  console.log(req.body);

  if (!title || !description || !videoFile || !thumbNail) {
    throw new ApiError(400, "Title or Description might be missing");
  }

  const video = await Video.create({
    videoFile: {
      public_id: videoFile?.public_id,
      url: videoFile?.url,
    },
    thumbnail: {
      public_id: thumbNail?.public_id,
      url: thumbNail?.url,
    },
    title,
    description,
    isPublished: true,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(500, "Something went wrong while uploading the video");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, video, "Video successfully uploaded"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const vid = await Video.findById(videoId);

  if (!vid) {
    throw new ApiError(400, "No such Video exists");
  }

  // Increase the view count by 1
  vid.views += 1;
  await vid.save();

  const owner = await User.findById(vid.owner);

  if (!owner) {
    throw new ApiError(400, "No such Owner exists");
  }

  const video = {
    ...vid.toObject(),
    ownerDetails: {
      username: owner.username,
      avatar: owner.avatar,
    },
  };

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video retrieved successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "No such Video exist");
  }

  const { title, description, thumbnail } = req.body;

  if (thumbnail) {
    await deleteOnCloudinary(video.thumbnail);
    video.thumbnail = thumbnail;
  }
  if (title) video.title = title;
  if (description) video.description = description;

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Updates done successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No Such Video exists");
  }

  if (req.user._id.toString() !== video.owner.toString()) {
    throw new ApiError(401, "Unauthorized request");
  }

  await deleteOnCloudinary(video.videoFile.public_id, "video");

  await deleteOnCloudinary(video.thumbnail.public_id);

  const result = await Video.deleteOne(new mongoose.Types.ObjectId(videoId));

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Deleted Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const video = await Video.findById(videoId);

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(201)
    .json(new ApiResponse(200, video, "video status toggled"));
});

const getVideoLikes = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const likeCount = await Like.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $count: "likeCount",
    },
  ]);

  const totalLikes = likeCount.length > 0 ? likeCount[0].likeCount : 0;

  return res
    .status(200)
    .json(new ApiResponse(200, { totalLikes }, "Like counts"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getVideoLikes,
};
