import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const videoViews = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
    {
      $project: {
        _id: 0,
        totalVideos: 1,
        totalViews: 1,
      },
    },
  ]);

  const subscriberCount = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribers: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalSubscribers: 1,
      },
    },
  ]);

  const subscribedChannelsCount = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribedChannels: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalSubscribedChannels: 1,
      },
    },
  ]);

  const likesCount = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoInfo",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "comment",
        foreignField: "_id",
        as: "commentInfo",
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweetInfo",
      },
    },
    {
      $project: {
        _id: 1,
        likedBy: 1,
        video: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$video", null] },
                {
                  $eq: [
                    { $arrayElemAt: ["$videoInfo.owner", 0] },
                    new mongoose.Types.ObjectId(req.user._id),
                  ],
                },
              ],
            },
            then: 1,
            else: 0,
          },
        },
        comment: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$comment", null] },
                {
                  $eq: [
                    { $arrayElemAt: ["$commentInfo.owner", 0] },
                    new mongoose.Types.ObjectId(req.user._id),
                  ],
                },
              ],
            },
            then: 1,
            else: 0,
          },
        },
        tweet: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$tweet", null] },
                {
                  $eq: [
                    { $arrayElemAt: ["$tweetInfo.owner", 0] },
                    new mongoose.Types.ObjectId(req.user._id),
                  ],
                },
              ],
            },
            then: 1,
            else: 0,
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: {
            $add: ["$video", "$comment", "$tweet"],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalLikes: 1,
      },
    },
  ]);

  if (!videoViews || !likesCount || !subscriberCount) {
    throw new ApiError(500, "unable to fetch data");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videoViews:
          videoViews.length != 0
            ? videoViews[0].totalViews
              ? videoViews[0].totalViews
              : 0
            : 0,
        totalVideos:
          videoViews.length != 0
            ? videoViews[0].totalVideos
              ? videoViews[0].totalVideos
              : 0
            : 0,
        subscriberCount:
          subscriberCount.length != 0 ? subscriberCount[0].totalSubscribers : 0,
        likesCount: likesCount.length != 0 ? likesCount[0].totalLikes : 0,
        subscribedChannelCount:
          subscribedChannelsCount.length === 0
            ? 0
            : subscribedChannelsCount[0].totalSubscribedChannels,
      },
      "Video views obtained"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
  ]);

  if (!videos) {
    throw new ApiError(500, "couldnot fetch user videos");
  }

  return res.status(200).json(new ApiResponse(200, videos, "videos fetched"));
});

const getChannelInfo = asyncHandler(async (req, res) => {
  const username = req.params.user;

  const user = await User.findOne({ username }).select(
    "-password -refreshToken -email -watchHistory"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const subscriberCount = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribers: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalSubscribers: 1,
      },
    },
  ]);

  const subscribedChannelsCount = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribedChannels: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalSubscribedChannels: 1,
      },
    },
  ]);

  const updatedUser = {
    ...user.toObject(),
    subscriberCount:
      subscriberCount.length !== 0 ? subscriberCount[0].totalSubscribers : 0,
    subscribedChannelCount:
      subscribedChannelsCount.length !== 0
        ? subscribedChannelsCount[0].totalSubscribedChannels
        : 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Channel info fetched successfully"));
});

export { getChannelStats, getChannelVideos, getChannelInfo };
