import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

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

  const aggregate = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $project: {
        createdAt: 1,
        views: 1,
        title: 1,
        isPublished: 1,
      },
    },
    {
      $sort: {
        views: -1,
      },
    },
  ]);

  const videos = await Promise.all(
    aggregate.map(async (video) => {
      const likes = await Like.countDocuments({ video: video._id });

      return {
        ...video,
        likes,
      };
    })
  );

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
        videos,
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
    .json(
      new ApiResponse(200, updatedUser, "Channel info fetched successfully")
    );
});

const getUsers = asyncHandler(async (req, res) => {
  const { match } = req.params;
  const { page, limit } = req.query;

  const regex = new RegExp(`^${match}`, "i");

  const aggregate = User.aggregate([
    {
      $match: {
        username: regex,
      },
    },
    {
      $addFields: {
        matchLength: {
          $strLenCP: {
            $substrCP: ["$username", 0, match.length],
          },
        },
      },
    },
    {
      $sort: {
        matchLength: -1,
        username: 1,
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        _id: 1,
        avatar: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  };

  const users = await User.aggregatePaginate(aggregate, options);

  const usersWithDetails = await Promise.all(
    users.docs.map(async (curUser) => {
      const [subscriberCount, isSubscribed] = await Promise.all([
        Subscription.countDocuments({ channel: curUser._id }),
        Subscription.exists({ channel: curUser._id, subscriber: req.user._id }),
      ]);

      const recentVideos = await Video.find({
        owner: curUser._id,
        isPublished: true,
      })
        .sort({ createdAt: -1 })
        .limit(2);

      return {
        ...curUser,
        subscriberCount,
        isSubscribed: !!isSubscribed,
        recentVideos,
      };
    })
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        docs: usersWithDetails,
        totalDocs: users.totalDocs,
        limit: users.limit,
        page: users.page,
        totalPages: users.totalPages,
        pagingCounter: users.pagingCounter,
        hasPrevPage: users.hasPrevPage,
        hasNextPage: users.hasNextPage,
        prevPage: users.prevPage,
        nextPage: users.nextPage,
      },
      "Fetched users"
    )
  );
});

export { getChannelStats, getChannelVideos, getChannelInfo, getUsers };
