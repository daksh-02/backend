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
  const { username } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Find the user by username
  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(404, "No user found");
  }

  // Define the aggregation pipeline
  const aggregate = Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user._id),
                "$likes.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        likes: 0,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  // Use aggregatePaginate to paginate the results
  const tweets = await Tweet.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { tweets, username: user.username, avatar: user.avatar },
        "Tweets retrieved successfully"
      )
    );
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
