import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"

const router = Router();

router.route("/register").post(
    //in here multer is been used in this middleware where it is editing the req sent by adding its middleware upload fields
    //it matches the name avatar or coverImage from req and creates the fields
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

export default router;