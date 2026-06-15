import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
 
const s3 = new AWS.S3({});
 
export const uploadBase64FileToS3 = async (
  base64File
) => { 
  // Parse data URI
 
  const matches = base64File.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 file format");
 
  const mimeType = matches[1]; // e.g., application/pdf
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
 
  // Determine extension
  const ext = mimeType.split("/")[1] || "bin";
 
  // Generate unique S3 key
  const fileName = `${uuidv4()}.${ext}`;
  const key = fileName;
 
  // Upload to S3
  await s3
    .putObject({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    })
    .promise();
 
  // Return the S3 URL
  //return `https://${process.env.ZAWS_BUCKET}.s3.${process.env.ZAWS_DEFAULT_REGION}.amazonaws.com/${key}`;
  return fileName;
};
 
export const getS3Url = (filePath) => {
  if (!filePath) return null;
  return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${filePath}`;
};