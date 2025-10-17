import dotenv from "dotenv";
import connectDB from "./db/index.js";
import express from "express";
import app from "./app.js";


dotenv.config();
// const app = express();

connectDB()
.then(() =>{
    console.log("Connected to the database successfully");

    app.on("error",(err)=>{
        console.error("Server error:", err);
        throw err;
    })

    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running on port ${process.env.PORT || 8000}`);

    })

    app.get("/test", (req, res) => {
      res.json({ message: "Test route working ✅" });
    });

})
.catch((err)=>{
    console.error("Failed to connect to the database", err);
})
