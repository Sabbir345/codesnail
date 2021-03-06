/* Add modules */
var utils = require('./utils'),
	config = require('./config'),
	emailing = require('./email');

/* Connect to database */
var mongoose = require("mongoose");
var collections = ["users", "providers", "courses", "badges"];
console.log("INFO", "connecting to database on:", config.database_url);
try {
    mongoose.connect(config.database_url, collections);
} catch (error) {
    console.log("ERROR", "failed to connect ot database: ", error);
    process.exit(1);
}
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
    initial: String,
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
	password: { type: String, default: "" },
	username: { type: String, unique: true, required: true, validate: /^[a-z0-9_-]{4,15}$/ },
	email: { type: String, unique: true, lowercase: true, trim: true, required: true, validate: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}\b/ },
	verification: {
		verification_hash: { type: String },
		verified: { type: Boolean, required: true, default: false }
	},
	profile: {
		points: { type: Number, default: 0 },
		mugshot: { type: String, default: "" },
		website: { type: String, default: "" },
		location: { type: String, default: "" },
		description: { type: String, default: "" },
		badges: [{ type: ObjectId, ref: 'Badge' }],
		tracks: [{ type: ObjectId, ref: 'Track' }],
		joined_date: { type: Date, required: true },
		providers: [{ type: ObjectId, ref: 'Provider' }],
	},
});

/* Database objects */
exports.Badge = mongoose.model("Badge", BadgeSchema);
exports.Provider = mongoose.model("Provider", ProviderSchema);
exports.Task = mongoose.model("Task", TaskSchema);
exports.Course = mongoose.model("Course", CourseSchema);
exports.Track = mongoose.model("Track", TrackSchema);
exports.User = mongoose.model("User", UserSchema);