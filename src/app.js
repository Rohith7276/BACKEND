import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app = express()

//use is used for middleware
// app.use(cors())
app.use(cors(
    {
        //this is used to allow the frontend to access the backend only by this url
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
))
//this is used to parse the data sent by the user in the form of json
app.use(express.json({limit: "16kb"}))
//this is used to parse the data sent by the user in the form of urlencoded data(links)
app.use(express.urlencoded({extended: true, limit: "16kb"}))
//this creates a public folder in our server which is used to store files like images and pdf, etc
app.use(express.static("public"))
//this is used to store secured information in user browser which is only accessible by our server
app.use(cookieParser()) 

//routes import
import userRouter from "./routes/user.routes.js"

//routes declaration
app.use("/api/v1/users", userRouter)

export {app}