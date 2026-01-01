 import { uploadFileCloudinary } from "../config/cloudinaryConfig.js";
import User from "../models/User.js";
import { sendOtpToEmail } from "../services/emailService.js";
import { sendOtpToPhoneNumber, twilioVerifyOtp } from "../services/twilioService.js";
import generateToken from "../utils/generateToken.js";
import response from "../utils/responseHandler.js";
import Conversation from "../models/Conversation.js";


// //otp handling
export const sendOtp = async (req, res) => {
  const { email , phoneNumber , phoneSuffix } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expirationTime = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
  let user;
  try {
    if(email){
        user = await User.findOne({ email });

    if (!user) {
      user = new User({ email });
    }
    user.emailOtp = otp;
    user.emailOtpExpires = expirationTime;
    await user.save();
    await sendOtpToEmail(email, otp);
    return response(res, 200, "OTP sent successfully", { email });
}

     if(!phoneNumber || !phoneSuffix){
    return response(res, 400, "Phone number and suffix are required");
}
const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
user = await User.findOne({ phoneNumber });
if (!user) {
  user = await new User({ phoneNumber,phoneSuffix });
}
await sendOtpToPhoneNumber(fullPhoneNumber);
await user.save();
return response(res, 200, "OTP sent successfully", user);
} catch (error) {
  console.error("Error sending OTP:", error);
  return response(res, 500, "Internal server error");
}
};


// // Varify otp
export const varifyOtp = async (req, res) => {
  const { email, phoneNumber, otp, phoneSuffix } = req.body;

  try {
    let user;
    if (email) {
      user = await User.findOne({ email });
      console.log(user)
      if (!user) {
      return response(res, 404, "User not found");
    }
    
    const now = Date.now();
    if(!user.emailOtp || String(user.emailOtp) !== String(otp) || now > new Date(user.emailOtpExpires)) {
      return response(res, 400, "Invalid or expired OTP");
    }

    user.isVerified = true;
    user.emailOtp = null;
    user.emailOtpExpires = null;
    await user.save();
}else{
    if(!phoneNumber || !phoneSuffix){
    return response(res, 400, "Phone number and suffix are required");
}
const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
user = await User.findOne({ phoneNumber });
if (!user) {
      return response(res, 404, "User not found");
}
const result=await twilioVerifyOtp(fullPhoneNumber, otp);
if(result.status !== "approved") {
        return response(res, 400, "Invalid or expired OTP");
}
user.isVerified = true;
await user.save();
}
const token = generateToken(user?._id);
res.cookie("auth_token", token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 });
return response(res, 200, "OTP verified successfully", { token, user });
} catch (error) {
    console.error("Error verifying OTP:", error);
    return response(res, 500, "Internal server error");
  }
};

export const updateProfile = async (req, res) => {

  const { username, agreedtoterms, about } = req.body;
  const userId = req.user.userId;

    try {
      const user = await User.findById(userId);
      const file = req.file;
      if (!user) {
        return response(res, 404, "User not found");
      }
      if (file) {
        const result = await uploadFileCloudinary(file);
        console.log("Cloudinary upload result:", result);

        user.profilePicture = result?.secure_url;
      }else if(req.body.profilePicture){
        user.profilePicture = req.body.profilePicture;
      }

      user.userName = username || user.userName;
      user.agreedToTerms = agreedtoterms || user.agreedToTerms;
      user.about = about || user.about;

      await user.save();
      return response(res, 200, "Profile updated successfully", user);
    } catch (error) {
      console.error("Error updating profile:", error);
      return response(res, 500, "Internal server error");
  }
};




////////////////////Logout
export const Logout = async (req, res) => {
  try {
    res.clearCookie("auth_token");
    return response(res, 200, "Logout successful");
  } catch (error) {
    console.error("Error logging out:", error);
    return response(res, 500, "Internal server error");
  }
};



//check authenticated
export const checkAuth = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) return response(res, 404, "User not found");
    return response(res, 200, "User is authenticated", { user });
  } catch (error) {
    console.error("Error checking authentication:", error);
    return response(res, 500, "Internal server error");
  }
};


//GetAllUsersExceptMe
export const getAllUsersExceptMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const users = await User.find({ _id: { $ne: userId } }).select("userName email profilePicture lastSeen isOnline about phoneNumber phoneSuffix").lean();

    const usersWithConversations = await Promise.all(users.map(async (user) => {
      const conversation = await Conversation.findOne({ participants: { $all: [userId, user?._id] } }).populate({ path: "lastMessage", select: "content createdAt sender receiver" }).lean();
      return { ...user, conversation: conversation | null };
    }));

    return response(res, 200, "Users fetched successfully", usersWithConversations);
  } catch (error) {
    console.error("Error fetching users:", error);
    return response(res, 500, "Internal server error");
  }
};