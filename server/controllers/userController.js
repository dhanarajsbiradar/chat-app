import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import Message from "../models/message.js"; // Import the Message model
import bcrypt from "bcryptjs";

// Sign up a new user
export const signup = async(req, res) => {
    const { fullName, email, password, bio } = req.body;

    try {
        if (!fullName || !email || !password || !bio) {
            return res.json({ success: false, message: "Missing Details" });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.json({ success: false, message: "Account already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName,
            email,
            password: hashedPassword,
            bio,
        });

        const token = generateToken(newUser._id);

        res.json({
            success: true,
            userData: newUser,
            token,
            message: "Account created successfully",
        });
    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message,
        });
    }
};

// Controller to login a user
export const login = async(req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email });

        if (!userData) {
            return res.json({ success: false, message: "User does not exist" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const token = generateToken(userData._id);

        res.json({
            success: true,
            userData,
            token,
            message: "Login successfully",
        });
    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message,
        });
    }
};

// Controller to check if user is authenticated
export const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
};

// Controller to update user profile details
export const updateProfile = async(req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;

        const userId = req.user._id;
        let updatedUser;

        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(
                userId, { bio, fullName }, { new: true }
            );
        } else {
            const upload = await cloudinary.uploader.upload(profilePic);
            updatedUser = await User.findByIdAndUpdate(
                userId, { profilePic: upload.secure_url, bio, fullName }, { new: true }
            );
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// ✅ Controller to fetch all users and unseen messages
export const getAllUsers = async(req, res) => {
    try {
        const currentUserId = req.user._id;

        // 1. Get all users except the current user
        const users = await User.find({ _id: { $ne: currentUserId } }).select(
            "-password"
        );

        // 2. Get unseen message counts grouped by sender
        const unseenMessages = await Message.aggregate([{
                $match: {
                    receiverId: currentUserId,
                    seen: false,
                },
            },
            {
                $group: {
                    _id: "$senderId",
                    count: { $sum: 1 },
                },
            },
        ]);

        // 3. Convert to { senderId: count }
        const unseenCountMap = unseenMessages.reduce((acc, item) => {
            acc[item._id.toString()] = item.count;
            return acc;
        }, {});

        res.json({
            success: true,
            users,
            unseenMessages: unseenCountMap,
        });
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};