const passport = require('passport');

const GoogleStrategy =
  require('passport-google-oauth20').Strategy;

const User = require('../models/User');

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:
          process.env.GOOGLE_CLIENT_ID,

        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET,

        callbackURL:
          process.env.GOOGLE_CALLBACK_URL
      },

      async (
        accessToken,
        refreshToken,
        profile,
        done
      ) => {
        try {
          const googleEmail =
            profile.emails?.[0]?.value
              ?.trim()
              .toLowerCase();

          if (!googleEmail) {
            return done(
              new Error(
                'Google did not provide an email address.'
              )
            );
          }

          const googleId =
            String(profile.id);

          const avatar =
            profile.photos?.[0]?.value || '';

          const googleName =
            profile.displayName?.trim() ||
            googleEmail.split('@')[0];

          /*
            First try to find the same Google account.
          */

          let user =
            await User.findOne({
              googleId
            });

          /*
            If no googleId exists, search by verified
            Google email. This links an existing local
            account instead of creating a duplicate.
          */

          if (!user) {
            user =
              await User.findOne({
                email: googleEmail
              });
          }

          if (user) {
            if (!user.isActive) {
              return done(
                new Error(
                  'This account has been disabled.'
                )
              );
            }

            user.googleId = googleId;
            user.provider = 'google';
            user.emailVerified = true;

            if (!user.avatar && avatar) {
              user.avatar = avatar;
            }

            if (!user.name && googleName) {
              user.name = googleName;
            }

            user.lastLoginAt = new Date();

            await user.save();

            return done(null, user);
          }

          /*
            Create a new customer account.
            Phone and password can be added later.
          */

          user = await User.create({
            name: googleName,
            email: googleEmail,
            phone: null,
            passwordHash: null,
            googleId,
            avatar,
            provider: 'google',
            emailVerified: true,
            role: 'customer',
            isActive: true,
            lastLoginAt: new Date()
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

module.exports = passport;
