// In here we are creating a custom error class that extends the Error class
//Bassically we are creating an error called ApiError 
class ApiError extends Error {
    constructor(
        statusCode,
        message= "Something went wrong in api",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }

    }
}

export {ApiError}