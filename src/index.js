import connectDB from "./db/index.js";
import dotenv from "dotenv";
import{ app }from "./app.js"

dotenv.config({
   path: '/path'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !! ",err)
})


/*
;(async () => {
    try {
        mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("ERROR ",error);
            throw error
        })

        app.listen(process.env.PORT , () => {
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("ERROR ",error)
        throw error
    }
})();
*/