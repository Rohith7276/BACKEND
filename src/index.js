import dotenv from "dotenv"; 
import connectDB from "./db/index.js";

dotenv.config({path: "./.env"});

connectDB()



// import express from 'express';
// const app = express()
// ;(async()=> {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (error) => {
//             console.log("ERROR", error)
//             throw error
//         })
//         qpp.listen(process.env.PORT, ()=>{
//             console.log("port:", process.env.PORT)
//         })
//     }
//     catch(error){
//         console.log(error)
//     }
// })()