const OTP = require('../models/OTP');
const User = require('../models/User')
const otpGenerator = require('otp-generator')
const bcrypt = require('bcrypt')
const Profile = require('../models/Profile')
const jwt = require('jsonwebtoken')
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
require('dotenv').config()

// Controller for sending OTP
exports.sendOtp = async (req,res) => {
    try {
        // Get email from req.body
        const {email} = req.body;

        // Check if User already exists
        const existingUser = await User.findOne({email});

        // If user exists, return a 401 (Unauthorized) error
        if(existingUser){
            return res.status(401).json({
                success:false,
                message: "Email already exists"
            })
        }

        // Generate OTP
        let otp = otpGenerator.generate(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        });

        // Check if OTP already exists (Unique OYP or not)
        let result = await OTP.findOne({otp:otp});

        while (result) {
            otp = otpGenerator.generate(6,{
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false,
            });
            result = OTP.findOne({otp:otp});
        }

        // Creating DB entry for OTP
        const createdOtp = await OTP.create({
            email,
            otp
        })

        // Return success response
        return res.status(200).json({
            success:true,
            message: "OTP created!",
            createdOtp
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

// Controller for Singing Up
exports.signUp = async (req,res) => {
    try {
        // Get all details from req.body
        const {
            firstName, 
            lastName,
            email,
            password,
            confirmPassword,
            accountType, 
            otp, contactNumber
        } = req.body;
        
        // Check if any field is empty
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(403).json({
                success:false,
                message: "Fill all details"
            })
        }
        
        // Check if password and confirm password match
        if(password!==confirmPassword){
            return res.status(403).json({
                success:false,
                message: "Passwords don't match"
            })
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({email});
    
        if(existingUser){
            return res.status(401).json({
                success:false,
                message: "Email already exists"
            })
        }
    
        // Find most recent OTP for the user
        const recentOtp = await OTP.find({email}).sort({createdAt:-1}).limit(1);
        console.log("Otp in signup page is:",recentOtp[0].otp)

        // Check if OTP exists
        if (recentOtp.length == 0) {
            return res.status(400).json({
                success:false,
                message:'OTP Not Found',
            })
        } else if(otp !== recentOtp[0].otp){
            return res.status(400).json({
                success:false,
                message:"Invalid OTP",
            });
        }
        
        // hash the password
        const hashedPwd = await bcrypt.hash(password, 10);
        
        let approved = "";
		approved === "Instructor" ? (approved = false) : (approved = true);

        // Create a new profile for the user so that we can create entry in DB
        const profileDetails = await Profile.create({
            gender:null,
            dateOfBirth: null,
            about:null,
            contactNumber:null,
        });
        
        console.log("Data received in signup is" ,firstName )
        const newUser = await User.create({
            firstName, 
            lastName,
            email,
            password: hashedPwd,
            accountType,
            approved: approved,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        })
        console.log("Data created successfully")
        return res.status(200).json({
            success:true,
            message:'User is registered Successfully',
            newUser,
        });    
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"User cannot be registered. Please try again",
        })
    }
}

// Controller for Logging In
exports.login = async (req,res) => {
    try {
        // Get email and password from req.body
        const {email, password} = req.body;

        // Check if email or password is empty
        if(!email || !password){
            return res.status(400).json({
                success:false,
                message:'Email or Password empty',
            })
        }

        // Check if user exists
        const existingUser = await User.findOne({email}).populate("additionalDetails").exec();
        if (!existingUser) {
            return res.status(400).json({
                success:false,
                message:'Email not registered',
            })
        }

        // Generate JWT token after password matching
        if (await bcrypt.compare(password, existingUser.password)) {
            const payload = {
                email:email,
                accountType: existingUser.accountType,
                id: existingUser._id
            }
    
            const token = jwt.sign(payload,process.env.JWT_SECRET, {
                expiresIn: "2h"
            } )
    
            existingUser.toObject();
            existingUser.token = token;
            existingUser.password = undefined;

            const options = {
                expires: new Date(Date.now() + 3*24*60*60*1000),
                httpOnly:true
            }

            //Create cookie and send response
            return res.cookie("token", token, options).status(200).json({
                success:true,
                message:'Login successfull',
                token, 
                existingUser
            })
        }
        else {
            return res.status(401).json({
                success:false,
                message:'Password is incorrect',
            });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Login Failure, please try again',
        });
    }
}

// Controller for Changing Password
exports.changePassword = async (req, res) => {
	try {
		// Get user data from req.user
		const userDetails = await User.findById(req.user.id);

		// Get old password, new password, and confirm new password from req.body
		const { oldPassword, newPassword } = req.body;

		// Validate old password
		const isPasswordMatch = await bcrypt.compare(
			oldPassword,
			userDetails.password
		);
		if (!isPasswordMatch) {
			// If old password does not match, return a 401 (Unauthorized) error
			return res
				.status(401)
				.json({ success: false, message: "The password is incorrect" });
		}

		// Match new password and confirm new password
		// if (newPassword !== confirmNewPassword) {
		// 	// If new password and confirm new password do not match, return a 400 (Bad Request) error
		// 	return res.status(400).json({
		// 		success: false,
		// 		message: "The password and confirm password does not match",
		// 	});
		// }

		// Update password
		const encryptedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUserDetails = await User.findByIdAndUpdate(
			req.user.id,
			{ password: encryptedPassword },
			{ new: true }
		);

		// Send notification email
		try {
			const emailResponse = await mailSender(
				updatedUserDetails.email,
				passwordUpdated(
					updatedUserDetails.email,
					`Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
				)
			);
			console.log("Email sent successfully:", emailResponse.response);
		} catch (error) {
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
		}

		// Return success response
		return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
	} catch (error) {
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
	}
};