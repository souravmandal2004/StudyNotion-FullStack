// const mongoose = require ("mongoose");
// require ("dotenv").config ();

// const connect = () => {
//     mongoose.connect (process.env.DATABASE_URL, {
//         useNewUrlParser: true,
//         useUnifiedTopology: tru
//     })
//     .then (() => console.log ("DB connected successfully"))
//     .catch ((error) => {
//         console.log ("DB connection failed!");
//         console.log (error);
//         process.exit (1);
//     });
// } 


// module.exports = connect;

const mongoose = require ("mongoose");
require ("dotend").config ();

const connect = () => {
    mongoose.connect (process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then ( () => console.log ("DB connected successfully"))
    .catch ( (error) => {
        console.log ("DB Connection failed");
        console.log ("error is: ", error);
        process.exit (1);
    });
}

module.exports = connect;