import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { verifyUser } from "../middlewares/auth.middlerware.js";
import { log } from "console";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { request } from "http";
import { access } from "fs";

//method for generating access token ans refresh token

const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error in generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {

  // get user data from frontend
  // validation data - not empty
  // check if user already exists: username and email
  // check for images and avatar
  // upload to cloudinary
  // create user object create entry in db
  // remove password and refresh token from response
  // check for user creation and respond

  // Extract all required fields including password
  const { username, fullname, email, password } = req.body;
  console.log(username, fullname, email);

  // Validate all fields are present
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // Get file paths from multer
  const avatarlocalpath = req.files?.avatar?.[0]?.path;
  //   const coverlocalpath = req.files?.cover?.[0]?.path;

  let coverlocalpath;
  if (req.files && req.files.cover && req.files.cover.length > 0) {
    coverlocalpath = req.files.cover[0].path;
  }

  if (!avatarlocalpath) {
    throw new ApiError(400, "Avatar image is required");
  }

  // Upload to cloudinary
  const avatar = await uploadToCloudinary(avatarlocalpath);
  const cover = coverlocalpath
    ? await uploadToCloudinary(coverlocalpath)
    : null;

  if (!avatar) {
    throw new ApiError(500, "Error in uploading avatar");
  }

  // Create user entry in database
  const user = await User.create({
    username: username.toLowerCase(),
    fullname,
    email,
    password,
    avatar: avatar.secure_url,
    cover: cover?.secure_url || "",
  });

  const newUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!newUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, newUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  console.log(email);

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found, invalid username or email");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateTokens(user._id);

  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
 await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: null },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", null, options)
    .cookie("refreshToken", null, options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req,res) => {
  const incomingRefreshToken =   req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken) {
    throw new ApiError(402, "unAuthorized reqest")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
  
   const user = await User.findById(decodedToken?._id)
  
   if(!user)
   {
    throw new ApiError(401,"Invalid refreshToken")
   }
  
   if(incomingRefreshToken !== user?.refreshToken)
   {
    throw new ApiError(401,"Reshresh TOken is Expired or Used")
   }
  
   const options = {
     httpOnly : true,
     secure : true
   }
  
    const{accessToken,newrefreshToken} =  await generateTokens(user._id)
  
   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",newrefreshToken,options)
   .json(
    new ApiResponse(200, {accessToken,refreshToken:newrefreshToken},"AccessTOken Refreshed")
   )
  
  } catch (error) {
    throw new ApiError(401,error?.message || "invalid refres token")
  }

})

const changeCurrentUserPassword = asyncHandler(async (req,res) => {
  
  const {oldpassword, newpassword, confpassword} = req.body

  if(!(newpassword === confpassword)){
    new ApiError(401,"New password and Confirm Password must be same")
  }

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.comparePassword(oldpassword)

  if(!isPasswordCorrect){
    throw new ApiError(401,"invalid Password")
  }

  user.password = newpassword
  await user.save({validateBeforeSave: false})

    return res.status(200)
              .json(new ApiResponse(201,{},"Password changes successfully"))

})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200)
              .json(new ApiResponse(200,req.user,"successfyllu fetched current user"))
})

const updateAccountDetails = asyncHandler(async (req,res) => {
  const { fullname, email, } = req.body;

  if(!fullname || !email){
    throw new ApiError(401,"All flied are required")
  }

  const user  = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set : {
        fullname,
        email
      }
    },
    {new:true}

  ).select("-password ")

  return res  
            .status(200)
            . json(new ApiResponse(200,user,"Account Details updated successfully"))

})

const updateUserAvatar = asyncHandler(async (req,res) => {
  const avatarLocalPath =   req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(401,"There is no avatar")
  }

   const newavatar = await uploadToCloudinary(avatarLocalPath)

  if(!newavatar.url){
    throw new ApiError(401,"Error while uploading avatar")
  }

 await  User.findByIdAndUpdate(
  req.user?._id,
  {
    $set : {
      avatar : avatar.url
    }
  },
  {new:true}
 ).select("-password")

  return res.status(200).json(new ApiResponse(201, {}, "New Avatar Updated"));


})

const updateUserCover = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;

  if (!coverLocalPath) {
    throw new ApiError(401, "There is no cover");
  }

  const newcover = await uploadToCloudinary(coverLocalPath);

  if (!newcover.url) {
    throw new ApiError(401, "Error while uploading cover");
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        cover: cover.url,
      },
    },
    { new: true }
  ).select("-password")

  return res  
            .status(200)
            .json(
              new ApiResponse(201,{},"New cover Updated")
            )

})

const getUserChannelProfile = asyncHandler(async (req,res) => {
 const {username} =  req.params

 if(!username?.trim()){
    throw new ApiError(400,"username is missing")
 }

 const channel = await User.aggregate([
   {
     $match: {
       username: username?.toLowerCase(),
     },
   },
   {
     $lookup: {
       from: "subscriptions",
       localField: "_id",
       foreignField: "channel",
       as: "subscribers",
     },
   },
   {
     $lookup: {
       from: "subscriptions",
       localField: "_id",
       foreignField: "subscriber",
       as: "subscribed",
     },
   },
   {
     $addFields: {
       subscribersCount: {
         $size: "$subscribers",
       },
       subscribedCount: {
         $size: "$subscribed",
       },
       isSubscribed: {
         $conditio: {
           if: { $in: [req.user?._id, "$subscribes.subscriber"] },
           then: true,
           else: false,
         },
       },
     },
   },
   {
     $project: {
       fullname: 1,
       username: 1,
       subscribersCount: 1,
       subscribedCount: 1,
       isSubscribed: 1,
       avatar: 1,
       cover: 1,
       email: 1,

     },
   },
 ])

 if(channel?.length){
  throw ApiError(404,"channel doen not exists")
 }



 return res   
            .status(200)
            .json(new ApiResponse(200,channel[0],"user channel fetched successfully"))

})

const getWatchHistory = asyncHandler(async (req,res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      }
    },
    {
      $lookup: {
        from: "videofile",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {$first: "owner"}
            }
          }
        ]
      }
    },

  ])

  return res  
            .status(200)
            .json(new ApiResponse(200,user[0].watchHistory,"watch history fetched Successfully"))

})



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCover,
  getUserChannelProfile,
  getUserChannelProfile,
  getWatchHistory
};
