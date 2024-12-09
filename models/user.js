const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { isEmail } = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [isEmail, "Please provide a valid email"],
      // the validate is to write a function that validates the email address. This will involve the use of an external package called validator.
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Minimum password length is 8"],
      validate: {
        validator: function (v) {
          const test =
            /^(?=.[a-z])(?=.[A-Z])(?=.\d)(?=.[@.#$!%?&])[A-Za-z\d@.#$!%?&]+$/.test(
              v
            );
          return !test;
        },
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      },
      //   regEx means 'regular expression' and it is used to check whether a string fits a particular pattern. It can be used for the pattern of the password. For exapmle the password must contain at least one uppercase, one lowercase, one number and also a special character.
    },
    resetToken: String,
    resetTokenExpiry: Date,
    yourevents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event", //References the Event model
      },
    ],
  },
  { timestamps: true }
);
// a mongoose pre-save hook is used to protect users' passwords before saving the document.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
module.exports = mongoose.model("User", userSchema);
