// models/DivideComment.js
import mongoose from "mongoose";

const divideCommentSchema = new mongoose.Schema({
  divideId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true, maxLength: 500 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
  dislikedBy: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const DivideComment = mongoose.models.DivideComment || mongoose.model("DivideComment", divideCommentSchema);
export default DivideComment;
