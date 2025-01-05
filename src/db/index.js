import mongoose from "mongoose";
//constants is just an file to store the constants
import { DB_NAME } from "../constants.js";

//this function is used to call the database and we will call this function in index.js file
// this function should always be in async await form because of the database stored in different planet
const connectDB = async () => {
    try {
        //try console.log of this connetionInstance
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\nMongoDB connected: ${connectionInstance.connection.host}\n`) 
    } catch (error) {
        console.log("Mongo error",error)
        //this process is given by node js which has many methods and numbers in exit
        process.exit(1)
    }
}

export default connectDB;