import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });

  const userId = user._id;

  const {
    page = 1,
    limit = 8,
    query,
    sortBy,
    sortType = "ascending",
  } = req.query;

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: {
        [sortBy]: sortType == "ascending" ? 1 : -1,
      },
    },
    {
      $skip: (page - 1) * 10,
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  if (!videos) {
    throw new ApiError(404, "No videos Found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos, length: videos.length, nextPage: parseInt(page) + 1 },
        "Videos fetched successfully"
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  if (!title && !description) {
    throw new ApiError(400, "Title or Description might be missing");
  }

  const thumbNAilPath = req.files?.thumbNail[0]?.path;
  const videoFilePath = req.files?.videoFile[0]?.path;

  if (!thumbNAilPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  if (!videoFilePath) {
    throw new ApiError(400, "Video is required");
  }

  const thumbNail = await uploadOnCloudinary(thumbNAilPath);
  const videoFile = await uploadOnCloudinary(videoFilePath);

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
    duration: videoFile?.duration,
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
  //TODO: get video by id
  console.log(videoId);
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "No such Video exist");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, video, "Video retrived successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "No such Video exist");
  }

  const { title, description } = req.body;
  const thumbNAilPath = req.file?.path;

  if (!thumbNAilPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const thumbNail = await uploadOnCloudinary(thumbNAilPath);
  if (!thumbNail) {
    throw new ApiError(400, "Thumbnail is required");
  }

  await deleteOnCloudinary(video.thumbnail);

  video.thumbnail = thumbNail.url;
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

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
