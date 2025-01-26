import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
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

//here we are setting routes (same as fetch function in react)
router.route("/login").post(loginUser)

//secured routes (verifyJWT is a middleware which verifies jwt and even gives access to the user to logoutUser function)
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

export default router;