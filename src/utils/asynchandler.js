//this is a util function to handle async functions in express
const asyncHandler = (reqestHandler) => {
    (req, res, next) =>{
        Promise.resolve(reqestHandler(req, res, next)).catch((err)=> next(err))
    }
}

export {asyncHandler}
 
// this is another type of async handler function
// const asyncHandler = (fn)=> async(req, res, next)=>{
//     try{
//         await fn(req, res, next)
//     }catch(err){
//         res.status(err.code||500).json({
//             success: false,
//             message: err.message||"Internal Server Error"
//         })
//     }
// }