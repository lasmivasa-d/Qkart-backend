const passport = require("passport");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");
const jwt = require('jsonwebtoken');

const verifyCallback = (req, resolve, reject) => async (err, user, info) => {
  if (err) {
    reject(err);
  } else if (!user) {
    reject(new ApiError(httpStatus.UNAUTHORIZED, "No valid user"));
  } else if (req.params && req.params.userId && req.params.userId !== info._id.toString()) {
    reject(new ApiError(httpStatus.FORBIDDEN, "Incorrect userID"));
  } else {
    req.user = user;
    resolve();
  }
};

const auth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, "No token provided"));
  }

  const token = authHeader.substring(7);
  
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, "Invalid token"));
  }

  // Check if the token is an access token
  if (!decoded || decoded.type !== 'access') {
    return next(new ApiError(httpStatus.UNAUTHORIZED, "Not an access token"));
  }

  // Check if the token is expired
  // console.log(decoded.exp);
  // console.log(Date.now() /1000);
  if (decoded.exp && decoded.exp < (Date.now() / 1000)) {
    console.log("Expired");
    return next(new ApiError(httpStatus.UNAUTHORIZED, "Token expired"));
  }

  return new Promise((resolve, reject) => {
    passport.authenticate(
      "jwt",
      { session: false },
      verifyCallback(req, resolve, reject)
    )(req, res, next);
  })
    .then(() => next())
    .catch((err) => next(err));
};

module.exports = auth;
