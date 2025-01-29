import { User } from "../models/user.model";
import { Playlist } from "../models/playlist.model";
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'; 
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose from 'mongoose';
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { username, videos, playlistName } = req.body

    if ([username, videos, playlistName].some((field) => field.trim == ""))
        throw new ApiError(400, "Empty fields requested")

    const existedPlaylist = await Playlist.findOne({
        playlistName
    })
    if (existedPlaylist) throw new ApiError(400, "Playlist already exists")

    const playlist = Playlist.create({
        playlistName,
        videos
    })
    const createdPlaylist = await playlist.fidById(playlist._id)

    if (!createdPlaylist) throw new ApiError(500, "Failed to create playlist")

    return res.
        status(200)
        .json(new ApiResponse(200, "Playlist created successfully", createdPlaylist))

})

const getPlaylist = asyncHandler(async (req, res) => {
    const { playlistName } = req.body
    if (!playlistName) throw new ApiError(400, "Playlist name is required") 

    const playlist = await Playlist.aggregate([
        {
            $match: {
                playlistName: playlistName
            }
        }, {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as:"videoOwner",
                            pipeline:[
                                {
                                    $project:{
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            $addFields:{
                videosCount: {$size: "$playlistVideos"}
            }, 
            $project:{
                playlistName: 1,
                playlistVideos: 1,
                videosCount: 1,
                owner: 1
            }
        }
    ])


})

const addVideoToPlaylist = asyncHandler(async(req,res)=>{
    const {videoFile, playlistName} = req.body
    if(!videoFile || !playlistName) throw new ApiError(400, "Video file and playlist name are required")
    
    const playlist = await Playlist.findOne({playlistName})
    const video = await Video.findOne({videoFile})
    
    if(!playlist) throw new ApiError(404, "Playlist not found")
    if(!video) throw new ApiError(404, "Video not found")
    if(playlist.owner !== req.user._id) throw new ApiError(401, "Unauthorized request")
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlist._id, {
        $push: {
            videos: video._id
        }
    }, {new: true}) 
    if(!updatedPlaylist) throw new ApiError(500, "Failed to add video to playlist")
    return res.status(200).json(new ApiResponse(200, "Video added to playlist successfully", updatedPlaylist))
})

export { createPlaylist, getPlaylist, addVideoToPlaylist }