/* Add modules */
var utils = require('./utils'),
	config = require('./config'),
	emailing = require('./email');

/* Connect to database */
var mongoose = require("mongoose");
var collections = ["users", "providers", "courses", "badges"];
console.log("INFO", "connecting to database on:", config.database_url);
mongoose.connect(config.database_url, collections);
/* Debug mode */
mongoose.set('debug', true);

var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;

/* Database schemas */
var BadgeSchema = new Schema({
	name: { type: String, unique: true, required: true },
	image: { type: String, required: true }
});

var ProviderSchema = new Schema({
	name: { type: String, required: true },
	mugshot: String,
	display_name: String,
	url: String
});

var TaskSchema = new Schema({
	name: { type: String, unique: true, required: true },
	description: String,
	verification: String,
	points: { type: Number, required: true, default: 0 },
	badge: { type: ObjectId, ref: 'Badge' }
});

var CourseSchema = new Schema({
	name: { type: String, unique: true, required: true },
	description: String,
	difficulty: String,
	keywords: [{ type: String }],
	tasks: [{ type: ObjectId, ref: 'Task' }],
	badge: { type: ObjectId, ref: 'Badge' }
});

var TrackSchema = new Schema({
	name: { type: String, unique: true, required: true },
	description: String,
	category: [{ type: ObjectId, ref: 'Course' }]
});

var UserSchema = new Schema({
	name: { type: String, required: true },
	email: { type: String, unique: true, lowercase: true, trim: true, required: true, validate: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}\b/ },
	password: { type: String, required: true, default: "default" },
	verification: {
		verified: { type: Boolean, required: true, default: false }, 
		verification_hash: { type: String, required: true, unique: true, default: "default" }
	},
	profile: {
		joined_date: { type: Date, required: true, default: Date.now },
		points: { type: Number, default: 0 },
		location: { type: String, default: "" },
		mugshot: { type: String, default: "" },
		website: { type: String, default: "" },
		description: { type: String, default: "" },
		providers: [{ type: ObjectId, ref: 'Provider' }],
		badges: [{ type: ObjectId, ref: 'Badge' }],
	},
	tracks: [{ type: ObjectId, ref: 'Track' }]
});

/* Predave for user */
UserSchema.pre('save', function(next) {
	/* When the user logs in with a provider first time */
	if (this.password == "default") {
		/* Calculate the password hash */
		this.password = utils.calculateHash("sha256", this.email + this.joined_date);
		/* Set user as verified */
		this.verification.verified = true;
		this.verification.verification_hash = utils.calculateHash("sha256", this.email + this.joined_date);
	}
	/* When the user registers first time */
	else if (this.verification.verification_hash == "default") {
		/* Calculate the password hash */
		this.password = utils.calculateHash("sha256", this.password + this.joined_date);
		/* Calculate the verification hash */
		this.verification.verification_hash = utils.calculateHash("sha256", this.email + this.joined_date);
		/* Send the user the verification email */
		emailing.sendRegistrationEmail(this.name, this.email, this.verification.verification_hash);
	}
	/* Set the mugshot and website from gravatar */
	this.profile.mugshot = this.profile.mugshot || config.gravatar.mugshot + utils.calculateHash("md5", this.email) + "?d=identicon";
	this.profile.website = this.profile.website || "#"
	next();
});

/* Database objects */
exports.Badge = mongoose.model("Badge", BadgeSchema);
exports.Provider = mongoose.model("Provider", ProviderSchema);
exports.Task = mongoose.model("Task", TaskSchema);
exports.Course = mongoose.model("Course", CourseSchema);
exports.User = mongoose.model("User", UserSchema);