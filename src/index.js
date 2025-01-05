import dotenv from "dotenv"; 
//make sure that you use index.js (.js is important)
import connectDB from "./db/index.js";
// import dotenv from "dotenv"
//add  "dev": "nodemon -r dotenv/config --experimental-json-modules src/index.js" in package.json
dotenv.config({path: "./.env"});

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log("Server: ", process.env.PORT);
    })
})

//this type is also used but not the good use of the codez
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