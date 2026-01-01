import twilio from 'twilio';

import dotenv from "dotenv";

dotenv.config();


const accountSid=process.env.TWILIO_ACCOUNT_SID
const authToken=process.env.TWILIO_AUTH_TOKEN
const serviceId=process.env.TWILIO_SERVICE_SID
const client = twilio(
  accountSid,
  authToken
);

export const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
   console.log(`Sending OTP to ${phoneNumber}`);
   if(!phoneNumber) {
     throw new Error("Phone number is required");
   }
   const response=await client.verify.v2.services(serviceId)
     .verifications
     .create({
       to: phoneNumber,
       channel: "sms"
     });
    console.log("Twilio response:", response);
    return response;
  } catch (error) {
    console.error("Error sending OTP:", error);
  }
};

export const twilioVerifyOtp = async (phoneNumber, otp) => {
  try {
   console.log(`Sending OTP to ${phoneNumber}`);
   console.log(`Trying to verify OTP: ${otp}`);
   
   const response=await client.verify.v2.services(serviceId)
     .verificationChecks
     .create({
       to: phoneNumber,
       code: otp
     });
    console.log("Twilio response:", response);
    return response;
  } catch (error) {
    console.error("Otp verification error:", error);
  }
};

