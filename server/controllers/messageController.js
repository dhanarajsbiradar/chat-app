// Imports
import Message from "../models/message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

// ✅ Get all users except logged-in user, and their unseen message counts
export const getUsersForSidebar = async(req, res) => {
    try {
        const userId = req.user._id;

        const filteredUsers = await User.find({ _id: { $ne: userId } }).select(
            "-password"
        );

        const unSeenMessages = {};

        // Fix: Loop over filteredUsers and count unseen messages from each user
        const promises = filteredUsers.map(async(user) => {
            const messages = await Message.find({
                senderId: user._id,
                recieverId: userId,
                seen: false,
            });

            if (messages.length > 0) {
                unSeenMessages[user._id.toString()] = messages.length;
            }
        });

        await Promise.all(promises);

        res.json({ success: true, users: filteredUsers, unSeenMessages });
    } catch (error) {
        console.error("Error in getUsersForSidebar:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ✅ Get all messages between logged-in user and selected user
export const getMessages = async(req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, recieverId: selectedUserId },
                { senderId: selectedUserId, recieverId: myId },
            ],
        });

        await Message.updateMany({ senderId: selectedUserId, recieverId: myId }, { seen: true });

        res.json({ success: true, messages });
    } catch (error) {
        console.error("Error in getMessages:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ✅ Mark a single message as seen
export const markMessageAsSeen = async(req, res) => {
    try {
        const { id } = req.params;

        await Message.findByIdAndUpdate(id, { seen: true });

        res.json({ success: true });
    } catch (error) {
        console.error("Error in markMessageAsSeen:", error.message);
        res.json({ success: false, message: error.message });
    }
};

// ✅ Send a message (text or image)
export const sendMessage = async(req, res) => {
    try {
        const { text, image } = req.body;
        const recieverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            recieverId,
            text,
            image: imageUrl,
        });

        // Emit to receiver via socket
        const recieverSocketId = userSocketMap[recieverId];
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", newMessage);
        }

        res.json({ success: true, newMessage });
    } catch (error) {
        console.error("Error in sendMessage:", error.message);
        res.json({ success: false, message: error.message });
    }
};