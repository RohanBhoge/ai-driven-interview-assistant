const User = require("../models/User");
const bcrypt = require("bcryptjs");
  //bcryptjs is a library to help you hash passwords

const jwt = require("jsonwebtoken");

// Register a new user
const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    // genSalt(10) generates a salt with 10 rounds of hashing
    // The higher the number, the more secure the hash, but also the longer it takes to compute
    // gensalt() is a method that generates a salt
    // The salt is a random string that is used to hash the password e.g. "s0m3r4nd0m5tr1ng"
    // The salt is stored with the hashed password in the database
    // The salt is used to hash the password.

    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword });
    await user.save();

    const payload = { userId: user._id };
    // payload is the data that will be stored in the token
    // userId is the id of the user that is being registered
    // The payload is used to identify the user when they log in
    // The payload is used to create the token
    // The payload is used to verify the token
    // The payload is used to decode the token
    // The payload is used to get the user id from the token
    // Create token with NO expiration

    const token = jwt.sign(payload, process.env.JWT_SECRET);
    //token is a string that is used to authenticate the user
    // sign() is a method that creates a token
    // The first argument is the payload
    // The second argument is the secret key that is used to sign the token
    // The secret key is stored in the .env file
    // The secret key is used to verify the token
    // The secret key is used to decode the token
    // The secret key is used to get the user id from the token
    // The secret key is used to create the token
    // The secret key is used to verify the token.
    // jwt is a library that creates and verifies JSON Web Tokens
    //jwt is made up of three parts: header, payload, and signature
    // The header contains the type of token and the signing algorithm
    // The payload contains the data that is stored in the token
    // The signature is used to verify the token


    res.status(201).json({ token });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login user
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = { userId: user._id };
    // Create token with NO expiration
    
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.json({ token, userId: user._id });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login };
