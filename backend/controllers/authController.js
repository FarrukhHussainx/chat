import User from "../models/User";
import { sendOtpToEmail } from "../services/emailService";
import { sendOtpToPhoneNumber, twilioVerifyOtp } from "../services/twilioService";
import response from "../utils/responseHandler";


//otp handling
const sendOtp = async (req, res) => {
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


// Varify otp
const varifyOtp = async (req, res) => {
  const { email, phoneNumber, otp, phoneSuffix } = req.body;

  try {
    let user;
    if (email) {
      user = await User.findOne({ email });
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
export { sendOtp, varifyOtp };