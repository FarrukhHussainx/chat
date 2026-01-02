import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/dbConnect.js";
import bodyParser from 'body-parser';  
import authRoute from "./routes/authRoute.js";
import chatRoute from "./routes/chatRoute.js";
  
import cors from "cors";

dotenv.config();

const app = express();

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.get("/test", (req, res) => {
  res.send("ESM route working");
});
//routes
app.use("/api/auth", authRoute);
app.use("/api/chat", chatRoute);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
