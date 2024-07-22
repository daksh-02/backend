import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  getVideoLikes,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, publishAVideo);

router.route("/allVideos/:username").get(getAllVideos);

router
  .route("/:videoId")
  .get(getVideoById)
  .delete(verifyJWT, deleteVideo)
  .patch(verifyJWT, updateVideo);

router.route("/likes/:videoId").get(verifyJWT, getVideoLikes);

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);

export default router;
