import { Router } from "express";
import {
  getChannelStats,
  getChannelVideos,
  getChannelInfo,
  getUsers
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();


router.route("/stats").get(verifyJWT,getChannelStats);
router.route("/videos").get(verifyJWT,getChannelVideos);
router.route("/:user").get(getChannelInfo)
router.route("/match/:match").get(verifyJWT,getUsers);

export default router;
