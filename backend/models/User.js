import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true, sparse: true },
  phoneSuffix: { type: String, unique: false },
  userName: { type: String},
  email: {
    type: String,
    trim: true, // Trims whitespace from the beginning/end of the string
    lowercase: true, // Converts email to lowercase before saving
    unique: true, // Creates a unique index (Note: not a validator itself, but a DB constraint)
    required: [true, 'Email address is required'],
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please enter a valid email address'
    ]
  },
  emailOtp: { type: String},
  emailOtp: { type: Date},
  profilePicture: { type: String, default: "default.jpg" },
  about: { type: String, default: "Hey there! I'm using this app." },
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  agreedToTerms: { type: Boolean, default: false }

},{timestamps: true});

const User = mongoose.model("User", userSchema);

export default User;
