/* Add modules */
var db = require('./database'),
    crypto = require('crypto'),
    utils = require('./utils'),
    config = require('./config'),
    passport = require('passport'),
    flash = require('connect-flash'),
    LocalStrategy = require('passport-local').Strategy,
	GitHubStrategy = require('passport-github').Strategy,
	TwitterStrategy = require('passport-twitter').Strategy,
	FacebookStrategy = require('passport-facebook').Strategy,
    LinkedInStrategy = require('passport-linkedin').Strategy,
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

/* Simple route middleware to ensure user does not go back to login or register after login. */
exports.checkLogin = function checkLogin(req, res, next) {
    /* When user is logged in */
    if (req.isAuthenticated() && req.user.verification.verified) {
        return res.redirect("/profile");
    }
    /* When user is not logged in */
    req.logout();
    return next();
}

/* Simple route middleware to ensure user is authenticated. Otherwise send to login page. */
exports.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
    /* When user is logged in */
    if (req.isAuthenticated() && req.user.verification.verified) {
        /* When guest user, the profile is not available */
        if (req.user.name.indexOf("Guest") != -1 && req.url == "/profile") {
            req.flash('error', ["Guest users have no profile"]);
            return res.redirect("/dashboard");
        }
        return next();
    }
    /* When user is not logged in, show login*/
    req.logout();
    res.redirect('/login');
}

/* Signup for a user */
var registerUser = function registerUser(name, email, provider_name, mugshot, link, done) {
    /* Find user by email */
    db.User.findOne({ email: email }).populate('profile.providers').exec(function (err, user) {
        if (err) return done(err);
        /* When the user with the email was found and the provider is registered */
        else if (user && user.profile.providers.map(function(elem) { return elem.name; }).join(",").indexOf(provider_name) > -1) return done(null, user);

        /* Register a new provider */
        var provider = new db.Provider({ name: provider_name, mugshot: mugshot, display_name: name, url: link });
        provider.save();
        /* When no user under this email was found */
        if (!user) {
            user = new db.User({ username: name.toLowerCase().replace(" ", "") , name: name, email: email });
            user.profile.mugshot = mugshot;
            user.profile.website = link;
        }
        /* Register this provider for the user */
        user.profile.providers.push(provider);
        /* Set the user as verified */
        user.verification.verified = true;
        /* Set the gravatar mugshot */
        user.profile.mugshot = user.profile.mugshot || config.gravatar.mugshot + utils.calculateHash("md5", user.email) + "?d=identicon";
        user.save(function(err) {
            if (err) console.log("ERROR", "error saving user:", err);
            else {
                console.log("INFO", "user saved:", user.email);
                /* Fetch the information again, for the new provider information */
                db.User.findOne({ email: email }).populate('profile.providers').exec(function (err, user) {
                    return done(null, user);
                });
            }
        });
    });
};

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new LocalStrategy(
    function(username, password, done) {
        process.nextTick(function () {
            /* Apply some filters on the username */
            var filteredUsername = username.toLowerCase().replace(" ", "");

            /* Find the user (entered username is either a email or the username of the user) */
            db.User.findOne({ $or:[{ username: filteredUsername }, { email: filteredUsername }] }).populate('profile.providers').exec(function (err, user) {
                if (err) return done(err);
                else if (!user) return done(null, false, { message: "Wrong username or password" });
                else if (user.password != utils.calculateHash("sha256", password + user.profile.joined_date)) 
                    return done(null, false, { message: "Wrong username or password" });
                else if (user.verification.verified == false)
                    return done(null, false, { message: "Please verify your user" });
                return done(null, user);
            });
        });
    }
));

passport.use(new GoogleStrategy({
        clientID: config.google.consumer_key,
        clientSecret: config.google.consumer_secret,
        callbackURL: config.google.callback
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            console.log("INFO", "google user info:", profile);
            registerUser(profile._json.name, profile._json.email, profile.provider, profile._json.picture, profile._json.link, done);
        });
    }
));

passport.use(new TwitterStrategy({
        consumerKey: config.twitter.consumer_key,
        consumerSecret: config.twitter.consumer_secret,
        callbackURL: config.twitter.callback
    },
    function(token, tokenSecret, profile, done) {
        process.nextTick(function () {
            console.log("INFO", "twitter user info:", profile);
            db.User.findOne({ name: new RegExp("^" + profile.displayName, "i") }).populate('profile.providers').exec(function (err, user) {
                if (err) done(err);
                /* No user with this display name was found */
                else if (!user) done(null, false, { message: "Twitter username must match your profiles: " + profile.displayName });
                /* The user was found */
                else registerUser(profile.displayName, user.email, profile.provider, profile._json.profile_image_url, profile._json.url, done);
            });
        });
    }
));

passport.use(new FacebookStrategy({
        clientID: config.facebook.consumer_key,
        clientSecret: config.facebook.consumer_secret,
        callbackURL: config.facebook.callback,
        profileFields: ['emails', 'displayName', 'photos', 'profileUrl']
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            console.log("INFO", "facebook user info:", profile);
            registerUser(profile._json.name, profile._json.email, profile.provider, profile._json.picture.data.url, profile._json.link, done);
        });
    }
));

passport.use(new LinkedInStrategy({
        consumerKey: config.linkedin.consumer_key,
        consumerSecret: config.linkedin.consumer_secret,
        callbackURL: config.linkedin.callback,
        profileFields: ['id', 'first-name', 'last-name', 'email-address', 'picture-url', 'public-profile-url']
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            console.log("INFO", "linkedin user info:", profile);
            registerUser(profile.displayName, profile._json.emailAddress, profile.provider, profile._json.pictureUrl, profile._json.publicProfileUrl, done);
        });
    }
));

passport.use(new GitHubStrategy({
        clientID: config.github.consumer_key,
        clientSecret: config.github.consumer_secret,
        callbackURL: config.github.callback
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            console.log("INFO", "github user info:", profile);
            registerUser(profile._json.name, profile._json.email, profile.provider, profile._json.avatar_url, profile._json.html_url, done);
        });
    }
));