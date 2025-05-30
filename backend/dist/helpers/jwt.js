"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _jsonwebtoken = require('jsonwebtoken'); var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);
var _boom = require('boom'); var _boom2 = _interopRequireDefault(_boom);

var _redis = require('../clients/redis'); var _redis2 = _interopRequireDefault(_redis);

const signAccessToken = (data) => {
	return new Promise((resolve, reject) => {
		const payload = {
			user_id: data._id,
		};

		const options = {
			expiresIn: "10d",
			issuer: "ecommerce.app",
		};

		_jsonwebtoken2.default.sign(payload, process.env.JWT_SECRET, options, (err, token) => {
			if (err) {
				console.log(err);
				reject(_boom2.default.internal());
			}

			resolve(token);
		});
	});
};

const verifyAccessToken = (req, res, next) => {
	console.log("Headers:", req.headers); // Debugging
	
	const authorizationHeader = req.headers["authorization"];
	if (!authorizationHeader) {
		console.log("Authorization header is missing!");
		return next(_boom2.default.unauthorized("Authorization header missing"));
	}

	const token = authorizationHeader.startsWith("Bearer ")
		? authorizationHeader.split(" ")[1]
		: authorizationHeader;

	console.log("Extracted Token:", token); // Debugging

	_jsonwebtoken2.default.verify(token, process.env.JWT_SECRET, (err, payload) => {
		if (err) {
			console.log("JWT Verification Error:", err.message); // Debugging
			return next(
				_boom2.default.unauthorized(
					err.name === "JsonWebTokenError" ? "Unauthorized" : err.message
				)
			);
		}

		console.log("Decoded Payload:", payload); // Debugging
		req.payload = payload;
		next();
	});
};



const signRefreshToken = (user_id) => {
	return new Promise((resolve, reject) => {
		const payload = {
			user_id,
		};
		const options = {
			expiresIn: "180d",
			issuer: "ecommerce.app",
		};

		_jsonwebtoken2.default.sign(payload, process.env.JWT_REFRESH_SECRET, options, (err, token) => {
			if (err) {
				console.log(err);
				reject(_boom2.default.internal());
			}

			_redis2.default.set(user_id, token, "EX", 180 * 24 * 60 * 60);

			resolve(token);
		});
	});
};

const verifyRefreshToken = async (refresh_token) => {
	return new Promise(async (resolve, reject) => {
		_jsonwebtoken2.default.verify(
			refresh_token,
			process.env.JWT_REFRESH_SECRET,
			async (err, payload) => {
				if (err) {
					return reject(_boom2.default.unauthorized());
				}

				const { user_id } = payload;
				const user_token = await _redis2.default.get(user_id);

				if (!user_token) {
					return reject(_boom2.default.unauthorized());
				}

				if (refresh_token === user_token) {
					return resolve(user_id);
				}
			}
		);
	});
};






exports.signAccessToken = signAccessToken; exports.verifyAccessToken = verifyAccessToken; exports.signRefreshToken = signRefreshToken; exports.verifyRefreshToken = verifyRefreshToken;
