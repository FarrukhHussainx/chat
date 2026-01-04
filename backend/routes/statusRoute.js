import express from "express";
import { multerMiddleware } from "../config/cloudinaryConfig.js";
import auth from "../middleware/auth.js";
import { createStatus, deleteStatus, getStatuses, markStatusAsViewed } from "../controllers/statusController.js";

const router = express.Router();

router.post("/", auth,multerMiddleware, createStatus);
router.get("/", auth, getStatuses);
router.delete("/:statusId", auth, deleteStatus);
router.put("/:statusId/view", auth, markStatusAsViewed);


export default router;
