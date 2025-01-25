import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
//User has the access to database cuz it is using mongoose
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from 'jsonwebtoken';
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

    if (!avatarLocalPath  ) {
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

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //we have refreshToken in user schema so we are setting it to the current generated one
        user.refreshToken = refreshToken

        //we are saving the refresh token in the database of the user
        //we have already validated the password so don't need of any further validation
        await user.save({validateBeforeSave: false })

        return {accessToken, refreshToken}

    }
    catch(error){
        throw new ApiError(500, "Something went wrong while generating token")
    }
}

const loginUser = asyncHandler(async(req, res) =>{
    const {email, username, password} = req.body;
    if(!username && !email){
        throw new ApiError(400, "username or password is required")
    }

    //checks for any one and user stores the data of that user
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const isPasswordMatch = await user.isPasswordCorrect(password);

    if(!isPasswordMatch){
        throw new ApiError(401, "Invalid credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

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
const logoutUser = asyncHandler(async(req, res) =>{
    //update the user refreshToken to undefined so that it is no longer used in browser
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {refreshToken: undefined}
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
    .clearCookie("accessToken", options )
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async(req, res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized")
    }

try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user || user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Unauthorized")
        }
    
        const option ={
            httpOnly: true,
            secure: true
        }
        
        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(new ApiResponse(200, {accessToken, refreshToken}, "Token refreshed successfully"))
    
} catch (error) {
    throw new ApiError(401, "Invalid refresh token")    
}
})
export { registerUser, loginUser, logoutUser, refreshAccessToken };
 