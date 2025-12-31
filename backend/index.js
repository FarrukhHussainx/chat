import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/dbConnect.js";
  
import cors from "cors";

dotenv.config();

const app = express();

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.get("/test", (req, res) => {
  res.send("ESM route working");
});




app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
