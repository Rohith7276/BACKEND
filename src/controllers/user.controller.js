import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
//User has the access to database cuz it is using mongoose
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose from 'mongoose';

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
    const existedUser = await User.findOne({
        $or: [{ email }, { username }],
    })

    if (existedUser) {
        console.log(existedUser);
        throw new ApiError(400, "User already exists");
    }

    console.log("multer files", req.files)

    //in here multer adds files to req from the middleware which includes the info of the file
    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar image");
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

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User created successfully"));

});

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //we have refreshToken in user schema so we are setting it to the current generated one
        user.refreshToken = refreshToken

        //we are saving the refresh token in the database of the user
        //we have already validated the password so don't need of any further validation
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating token")
    }
}

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    if (!username && !email) {
        throw new ApiError(400, "username or password is required")
    }

    //checks for any one and user stores the data of that user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordMatch = await user.isPasswordCorrect(password);

    if (!isPasswordMatch) {
        throw new ApiError(401, "Invalid credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //this is used for security purpose
    const options = {
        httpOnly: true,
        secure: true
    }

    //here we are setting the cookies in the browser with access and refresh token 
    // the response has the json containing the user data and the tokens
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

//before logginout we use middleware
const logoutUser = asyncHandler(async (req, res) => {
    //update the user refreshToken to undefined so that it is no longer used in browser
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            //this ensures that the updated user is returned
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    //here we are clearing the cookie from the browser
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user || user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized")
        }

        const option = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", refreshToken, option)
            .json(new ApiResponse(200, { accessToken, refreshToken }, "Token refreshed successfully"))

    } catch (error) {
        throw new ApiError(401, "Invalid refresh token")
    }
})

//here we use user.save and not user.findByIdAndUpdate
const changeCurrentUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const checkPass = await user.isPasswordCorrect(oldPassword)

    if (!checkPass) {
        throw new ApiError(400, "Invalid password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched successfully")
})

//use file updates separatly because to avoid resending text to the database everytime and directly update only image at a time
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    //set is mongodb method used to update the values
    const user = await User.findByIdAndUpdate(
        req.user?._id, {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    if (!user)
        throw new ApiError(400, "Invalid user credentials")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath)
        throw new ApiError(400, "Avatar file is missing")

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url)
        throw new ApiError(400, "Error while uploading on avatar")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"))
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    //here we are useing req.file and not req.files cuz the user is sending only one avatar image but in up function user is sending multiple files(avatar and coverimage)
    const coverLocalPath = req.file?.path

    if (!coverLocalPath)
        throw new ApiError(400, "Cover Image file is missing")

    const cover = await uploadOnCloudinary(coverLocalPath)

    if (!cover.url)
        throw new ApiError(400, "Error while uploading on cover image")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: cover.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image updated successfully"))
})

//we are using aggregate pipeline to get the user channel profile
//so basically this function is creating a model document consisting of the chanel contents like count, subscribers, subscribedto and is subscribed .
const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
    // aggregate takes pipeline of stages
    const channel = await User.aggregate([
        //Stage 1: matching the username
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        //Stage 2: lookup is used to join the collections(by creating an array  )
        {
            //This is Subscribers count
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            //This is Channels Subscribed to count
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        //Stage 3: adding fields to the data
        {
            //These are actual count 
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        //this is checking insider the subscribers array if the user is present or not
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            //Here we are reshaping the user model to get only the required fields(we are adding subscriber count, channels subscribed to count and isSubscribed)
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory", 
                pipeline: [
                    {
                        $lookup:{
                            from: "users", 
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $arrayElemAt: ["$owner", 0]
                                //$first: "$owner"
                            }
                        }
                    }
                ]
            }
        } 
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentUserPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory };