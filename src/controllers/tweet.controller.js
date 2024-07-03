import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content) {
    throw new ApiError("400", "Content is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  if (!tweet) {
    throw new ApiError(500, "Something went wrong while adding the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { tweet }, "Tweet uploded successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets

  const {userId} = req.params;

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets retrived successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "User not found");
  }
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { content } = req.body;

  tweet.content = content;

  await tweet.save();

  return res.status(200).json(new ApiResponse(201, tweet, "Tweet is updated"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet

  const { tweetId } = req.params;

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "User not found");
  }
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Unauthorized request");
  }

  const result = await Tweet.deleteOne(new mongoose.Types.ObjectId(tweetId));

  if (!result) {
    throw new ApiError(500, "Could not delete the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
