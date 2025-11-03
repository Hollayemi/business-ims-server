const dns = require("dns");

exports.checkInternet = () => {
    return new Promise((resolve) => {
        dns.lookup("google.com", (err) => {
            resolve(!err); // true if online, false if offline
        });
    });
}