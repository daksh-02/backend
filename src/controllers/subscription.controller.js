import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const channel = await User.findOne({username : channelId});
  // TODO: toggle subscription
  const existingSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channel._id,
  });

  if (existingSubscription) {
    const result = await Subscription.deleteOne({
      subscriber: req.user._id,
      channel: channel._id,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Channel unsubscribed"));
  }

  const new_subscriber = await Subscription.create({
    subscriber: req.user._id,
    channel: channel._id,
  });

  if (!new_subscriber) {
    throw new ApiError(500, "Server error");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, new_subscriber, "Channel subscribed"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId) {
    throw new ApiError(400, "channelId is Requitred!!");
  }
  try {
    const subscribers = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $group: {
          _id: "channel",
          subscribers: { $push: "$subscriber" },
        },
      },
      {
        $project: {
          _id: 0,
          subscribers: 1,
        },
      },
    ]);

    if (!subscribers || subscribers.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No subscribers found for the channel"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribers,
          "All Subscribers fetched Successfully!!"
        )
      );
  } catch (e) {
    throw new ApiError(500, e?.message || "Unable te fetch subscribers!");
  }
});

// controller to return channel list to which user has subscribed
/*
first using users channel id we fetch where the subscriber is current user and get all channel names
*/
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "subscriberId is Requitred!!");
  }
  try {
    const subscribedChannels = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $group: {
          _id: "subscriber",
          subscribedChannels: { $push: "$channel" },
        },
      },
      {
        $project: {
          _id: 0,
          subscribedChannels: 1,
        },
      },
    ]);

    if (!subscribedChannels || subscribedChannels.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, [], "No subscribedChannel found for the user")
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribedChannels,
          "All SubscribedChannels fetched Successfully!!"
        )
      );
  } catch (e) {
    throw new ApiError(
      500,
      e?.message || "Unable te fetch subscribedChannels!"
    );
  }
});

const isSubscribed = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const channelDetails = await User.findOne({ username: channelId });

  const existUser = await Subscription.findOne({
    $and: [{ channel: channelDetails._id }, { subscriber: req.user._id }],
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { status: existUser ? true : false },
        "Checked if user is subscribed to this channel"
      )
    );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
  isSubscribed,
};
