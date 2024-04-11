const User = require ("../models/user.model.js");
const OTP = require ("../models/otp.model.js");
const Profile = require ("../models/profile.model.js");
const otpGenerator = require ("otp-generator");
const bcrypt = require ("bcrypt");
const jwt = require ("jsonwebtoken");
require ("dotenv"). config ();

// sendOTP
exports.sendOtp = async (req, res) => {
    try {
        // Fetch email from req body
        const {email} = req.body;

        // Check if user already exists
        const checkUserPresent = await User.findOne ( {email} );

        // if user already exists then return a response 
        if (checkUserPresent) {
            return res.status (401). json ({
                success: false,
                message: "User already exists",
            });
        }

        // if user doesn't exist, then generate otp
        var otp = otpGenerator.generate (6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });
        console.log ("OTP generated", otp);

        // The otp must be unique so check it
        let result = await OTP.findOne ( {otp: otp});
        console.log ("If the otp is unique or not", result);

        // Jab tak database se same otp mil rha tab tak new otp generate krte jao
        while (result) {
            otp = otpGenerator.generate (6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            const otpPayload = {email, otp};    // by default it will take the value of createdAt as Date.now()

            // create an entry for otp in database
            const otpBody = await OTP.create (otpPayload);
            console.log ("OTP ki body", otpBody);

            // return a response
            res.status (200). json ({
                success: true,
                message: "OTP sent successfully",
                otp
            });
        }
    }

    catch (error) {
        console.log ("The error while generating the otp", error);
        return res.status (500). json ({
            success: false,
            message: error.message,
        });
    }
}



// signup

exports.signUp = async (req, res) => {

    try {
        // data fetch from req body
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp
        } = req.body;

        // validate the data
        if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
            return res.status (403). json ({
                success: false,
                message: "All the fields are required!",
            });
        }

        // 2 password match krlo, password and confirmPassword ko
        if (password !== confirmPassword) {
            res.status (400). json ({
                success: false,
                message: "Password and confirmPassword must be same, please try again",
            });
        }


        // check user already exists or not
        const existingUser = await User.findOne ({email});

        // agr user already exists
        if (existingUser) {
            return res.status (400). json ({
                success: false, 
                message: "User is already registered",
            });
        }


        // find most recent otp for the user stored in the database
        const recentOtp = await User.find ({email}).sort ({createdAt: -1}). limit(1);
        console.log ("Recent OTP is:", recentOtp);

        // Now validate the otp
        if (recentOtp === 0) {
            // OTP not found
            return res.status (400). json ({
                success: false,
                message: "OTP not found"
            });
        }
        else if (otp !== recentOtp.otp) {
            // Invalid otp 
            return res.status (400). json ({
                success: false,
                message: "OTP is not valid"
            }); 
        }
        // Agr dono otp same h to
        // Hash the password
        const hashedPassword =  await bcrypt.hash (password, 10);

        // entry create in the database
        const profileDetails = await Profile.create ({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null,
        });

        const user = User.create ({
            firstName, 
            lastName,
            email,
            contactNumber,
            password: hashedPassword,
            accountType,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,   // to create a profile pic according to the username, like Sourav Mandal is going to be SM
        });

        // return response
        return res.status (200). json ({
            success: true,
            message: "Sign Up successfull",
            user
        });
    }
    catch (error) {
        console.log ("Error while sign up: ", error);

        // return the response
        return res.status (500).json ({
            success: false,
            message: "User can't be register right now, please try again",
        });
    }
}




// login
exports.login = async (req, res) => {
    try {
        // get data from req body
        const {email, password} = req.body;

        // Validate the data
        if (!email || !password) {
            return res.status (403). json ({
                success: false,
                message: "All the fields are required",
            }); 
        }

        // Check if the user is registered or not
        const user = await User.findOne ( {email} ). populate ("additionalDetails");

        if (!user) {
            return res.status (401). json ({
                success: false,
                message: "User is not registered, please sign up first",
            });
        }

        // generate JWT, after matching the password
        if (await bcrypt.compare (password, user.password)) {
            // now generate the token because the password has matched
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType,
            }
            const token = jwt.sign (payload, process.env.JWT_SECRET, {
                expiresIn: "2h",
            });
            user.token = token;
            user.password = undefined;

            // create cookie and return the response
            const options = {
                expires: new Date (Date.now() + 3*24*60*60*1000),
                httpOnly: true,
            };

            res.cookie ("token", token, options). status (200).json ({
                success: true,
                token,
                user,
                message: "Logged in successfully",
            })
        }

        else {
            return res.status (401). json ({
                success: false,
                message: "Password is incorrect",
            });
        }
}
    catch (error) {
        console.log (error);
        return res.status (500). json ({
            success: false,
            message: "User cannot be registered, please try again after sometime",
        });
    }
}

// Controller for Changing Password
exports.changePassword = async (req, res) => {
	try {
		// Get user data from req.user
		const userDetails = await User.findById(req.user.id);

		// Get old password, new password, and confirm new password from req.body
		const { oldPassword, newPassword, confirmNewPassword } = req.body;

		// Validate old password
		const isPasswordMatch = await bcrypt.compare(
			oldPassword,
			userDetails.password
		);
		if(oldPassword === newPassword){
			return res.status(400).json({
				success: false,
				message: "New Password cannot be same as Old Password",
			});
		}
		
		if (!isPasswordMatch) {
			// If old password does not match, return a 401 (Unauthorized) error
			return res
				.status(401)
				.json({ success: false, message: "The password is incorrect" });
		}

		// Match new password and confirm new password
		if (newPassword !== confirmNewPassword) {
			// If new password and confirm new password do not match, return a 400 (Bad Request) error
			return res.status(400).json({
				success: false,
				message: "The password and confirm password does not match",
			});
		}

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
				"Study Notion - Password Updated",
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