import mongoose from "mongoose" 

const playlistSchema = new mongoose.Schema({
    playlistName:{
        type: String,
        required: true,
        unique: true
    },
    videos: [
        {
            type: mongoose.Schema.ObjectId,
            ref: video
        }
    ],
    owner: {
        type: mongoose.Schema.ObjectId,
        ref: "User"
    },
    

},{ timestamps: true })

export const Playlist = mongoose.model("Playlist", playlistSchema)