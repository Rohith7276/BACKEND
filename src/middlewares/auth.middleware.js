import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

//we should verify jwt to avoid any mallecious activity made from outside the server
export const verifyJWT = asyncHandler(async(req, _, next)=>{
   try {
    // the token will be present in the cookie or in the header
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
     if(!token){
         throw new ApiError(401, "Unauthorized request")
     }
     //after getting the token we will use the token to get the user info n modify the user (which is empty) n store it, which will be later accessable using req.user in the routes
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
 
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
 
     if(!user){
         throw new ApiError(404, "User not found")
     }
 
     // here we are sending the user to the routes
     req.user = user;
     next()
     
   } catch (error) {
       throw new ApiError(401, "Unauthorized request")    
   }
})