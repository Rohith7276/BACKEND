import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
//User has the access to database cuz it is using mongoose
import { User } from '../models/User.js';
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, username } = req.body;
    console.log(fullName, email, password, username);

    // here its checking if any one of the following is empty
    //array.some returns true if any of the following condition is true 
    if (
        [fullName, email, password, username].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    //in here $or: is used as binary operation in finding the user
    const existdUser = User.findOne({
        $or: [{ email }, { username }],
    })

    if (existdUser) {
        throw new ApiError(400, "User already exists");
    }

    console.log("multer files",req.files)

    //in here multer adds files to req from the middleware which includes the info of the file
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath || !coverImageLocalPath){
        throw new ApiError(400, "Avatar/Cover Image is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(500, "Failed to upload avatar image");
    }
    if(!coverImage){
        throw new ApiError(500, "Failed to upload cover image");
    }

    //storing the user in the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage.url,
        email,
        password,
        username: username.toLowerCase()
    })

    //this will search for the user and stores it's data except password and refreshToken
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User created successfully"));

});

export { registerUser };