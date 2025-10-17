
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.MY_CLOUD_NAME,
  api_key: process.env.MY_API_KEY,
  api_secret: process.env.MY_API_SECRET,
});

const uploadToCloudinary = async (localFilePath) => {
  try {
    console.log("📸 Uploading file:", localFilePath);
    if (!localFilePath) throw new Error("❌ No local file path provided");

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("✅ Cloudinary upload success:", response.secure_url);

    fs.unlinkSync(localFilePath); // remove after success
    return response;
  } catch (error) {
    console.error("🔥 Cloudinary upload error:", error.message);
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // clean up only if exists
    }
    throw new Error("Failed to upload avatar to cloudinary");
  }
};

export { uploadToCloudinary };
