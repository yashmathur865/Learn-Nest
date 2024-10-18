const User = require("../models/User")
const crypto = require('crypto')
const mailSender = require('../utils/mailSender');
const bcrypt = require('bcrypt')

// Reset Password Token
exports.resetPasswordToken = async (req,res) => {

   try {
       // Get email from req.body
       const {email} = req.body;

       // Check if email is empty
       if(!email){
           return res.status(400).json({
               success:false,
               message:"Email is empty"
           })
       }

       // Check if user exists
       const existingUser = await User.findOne({email})

       if(!existingUser){
           return res.status(400).json({
               success:false,
               message:"Email doesn't exist"
           })
       }

       // Generate token
       const token = crypto.randomUUID()

         // Update user with token
       const updatedUser = await User.findOneAndUpdate({email},
                                                    {
                                                    token:token,
                                                    resetPasswordExpires: Date.now() + 5*60*1000
                                                    },
                                                    {new:true})

       // Create reset password link
       const url = `http://localhost:3000/update-password/${token}`

         // Send mail Containing reset password link
       await mailSender(email, "Password Reset Link", `Password reset link: ${url}`);

       // Send response
       return res.status(200).json({
           success:true,
           message:'Reset link sent'
       })
   } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Something went wrong while sending reset pwd mail'
        })
   }
}

// Reset Password
exports.resetPassword = async (req,res) => {

    try {
        // Get token, password and confirmPassword from req.body
        const {token, password, confirmPassword} = req.body;

        // Check if token, password or confirmPassword is empty
        if(!token||!password||!confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Enter all details"
            })
        }

        // Check if user exists
        const existingUser = await User.findOne({token:token});
        if(!existingUser) {
            return res.json({
                success:false,
                message:'Token is invalid',
            });
        }

        // Check if token is expired
        if(existingUser.resetPasswordExpires<Date.now()){
            return res.status(500).json({
                success:false,
                message:"Token is no longer valid"
            })
        }

        if (password!==confirmPassword) {
            return res.status(500).json({
                success:false,
                message:"Password Don't match"
            })
        }

        // Hash password
        const hashedPwd = await bcrypt.hash(password, 10);
        // Update user with new password
        const updatedUser = await User.findOneAndUpdate({token},{
            password:hashedPwd
        },{new:true})
        console.log("Updated user after password change is", updatedUser)
        // Send response
        return res.status(200).json({
            success:true,
            message:"Password Changed successfully"
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Something went wrong while reseting password'
        })
    }
}