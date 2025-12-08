// generate-hash.js
const bcrypt = require('bcrypt');
const cuid = require('cuid');

const plainPassword = 'e"5vQiCw&*CKz+>P';
const saltRounds = 10; // A good standard value

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error hashing password:", err);
        return;
    }
    console.log("Your CUID (for the 'id' column):");
    console.log(cuid());
    console.log("\n-------------------------------------\n");
    console.log("Your email: admin@evangelosommer.com");
    console.log("Your hashed password (copy this):");
    console.log(hash);
});
