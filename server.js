var http = require("http"),
    server = http.createServer(function (req, res) {
        console.log(req.headers);
        console.log(req.url);
    });
server.listen(3000);