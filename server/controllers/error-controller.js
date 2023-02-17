`use strict`


// GLOBAL ERR. HANDLER MIDDLEWARE > DERIVES PROPS. FROM ServerError CLASS
const ServerError = require("../utils/app-error.js");
const chalk = require("../utils/chalk-messages.js");


// // SIMPLE ERROR CONTROLLER
// module.exports = (err, req, res, next) => {
// 	// console.log(err.stack);
// 	console.log(err.name);
// 	err.statusCode = err.statusCode || 500;
// 	err.status = err.status || `error`;
// 	err.owner = err.owner || `undef. owner`;
// 	res.status(err.statusCode).json({
// 		status: err.status,
// 		message: err.message,
// 		owner: err.owner,
// 	});
// 	next();
// };


const handleCastErrorDB = (err) => {
	const message = `Invalid ${err.path}: ${err.value}`;
	return new ServerError(message, 400);
};


const handleDuplicateFieldsDB = (err) => {
	const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
	const message = `Duplicate field value: ${value}. Please use another value!`;
	return new ServerError(message, 400);
};


const handleValidationErrorDB = (err) => {
	const errors = Object.values(err.errors).map((el) => el.message);
	const message = `Invalid input data. ${errors.join(". ")}`;
	return new ServerError(message, 400);
};


const handleJWTError = () => new ServerError("Invalid token. Please login again. Also check your connection is secure.", 401);


const handleJWTExpiredError = () =>
	new ServerError("Session expired. Please login again.", 401);


/**
 * @function sendErrorDev
 * @description Sends error response in development environment.
 * @param {Error} err - Error object
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} - Response object
 */
const sendErrorDev = (err, req, res) => {

	// If request is for API endpoint, send JSON response
	if (req.originalUrl.startsWith("/api")) {
		return res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack,
		});
	};

	// Log error
	console.error(chalk.fail(`ERROR 🥺🥺🥺`, `[ ${err.caller} ]`, err.message));

	// Send error message as HTML
	return res.status(err.statusCode).render("404", {
		err_status_code: err.statusCode,
		err_title: "Something went wrong...",
		err_msg: `[ ${err.message} ]`,
	});
};



const sendErrorProd = (err, req, res) => {

	if (req.originalUrl.startsWith("/api")) {3

		// Operational, trusted error: send message to client
		if (err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message,
			});
		};

		// 1) Log error
		console.error("ERROR 🥺", err);

		// 2) Send error message
		return res.status(500).json({
			status: "error",
			message: "Something went wrong!",
		});
	};

	if (err.isOperational) {

		console.log(err);
		return res.status(err.statusCode).render("404", {
			err_status_code: err.statusCode,
			err_title: "Something went wrong!",
			err_msg: err.message,
		});
	};

	// 1) Log error
	console.error("ERROR 🥺", err);

	// 2) Send error message
	return res.status(err.statusCode).render("404", {
		err_status_code: err.statusCode,
		err_title: "Something went wrong...",
		err_msg: "Please try again later.",
	});
};


// REMOVE > DEPRC. BELOW
// module.exports = (err, req, res, next) => {
// 	err.statusCode = err.statusCode || 500;
// 	err.status = err.status || "error";
// 	err.caller = err.caller || `💥 This is probably not a server error.`

// 	if (process.env.NODE_ENV === "development") {
// 		sendErrorDev(err, req, res);
// 	} else if (process.env.NODE_ENV === "production") {
// 		let error = { ...err };
// 		error.message = err.message;
// 		if (error.name === "CastError") error = handleCastErrorDB(error);
// 		if (error.code === 11000) error = handleDuplicateFieldsDB(error);
// 		if (error.name === "ValidationError") error = handleValidationErrorDB(error);
// 		if (error.name === "JsonWebTokenError") error = handleJWTError(error);
// 		if (error.name === "TokenExpiredError") error = handleJWTExpiredError(error);
// 		sendErrorProd(error, req, res);
// 	};
// };

/**
 * Express middleware for handling errors.
 * @param {Error} err - Error object
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  err.caller = err.caller || `💥 This is probably not a server error.`;

  // Handle errors differently in development and production environments
  if (process.env.NODE_ENV === "development") {

    sendErrorDev(err, req, res);

  } else if (process.env.NODE_ENV === "production") {

    // Clone the error object to avoid modifying the original
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === "CastError") {
      error = handleCastErrorDB(error);
    } else if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    } else if (error.name === "ValidationError") {
      error = handleValidationErrorDB(error);
    } else if (error.name === "JsonWebTokenError") {
      error = handleJWTError(error);
    } else if (error.name === "TokenExpiredError") {
      error = handleJWTExpiredError(error);
    }

    // Send error response using production error handler
    sendErrorProd(error, req, res);
  }
};
