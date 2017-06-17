function createServer(rootDir) {
    let app = require('express')();
    let http = require("http").Server(app);
    let io = require('socket.io')(http);

    app.get("/", function(request, response) {
        response.sendFile(rootDir + "/index.html");
    });

    app.get("/client.js", function(request, response) {
        response.sendFile(rootDir + "/client.js");
    });

    let clients = {};

    let gameIdCounter = 0;
    let createGame = function(clientAId, clientBId) {
        let clientA = clients[clientAId];
        let clientB = clients[clientBId];

        let game = {
            "clientA": {
                "id": clientAId,
                "input": null
            },
            "clientB": {
                "id": clientBId,
                "input": null
            },
            "id": gameIdCounter++,
        };
        clientA.game = game;
        clientA.socket.emit("startGame", {
            "opponentName": clientB.name,
            "gameId": game.id,
        });

        clientB.game = game;
        clientB.socket.emit("startGame", {
            "opponentName": clientA.name,
            "gameId": game.id,
        });

        console.log("Created new game " + game.id + " between players " + clientAId + " and " + clientBId + ".");
    };

    let findMatch = function(clientId) {
        for (let id in clients) {
            if (id !== clientId && clients[id].game === null) {
                createGame(clientId, id);
                return;
            }
        }
    };

    let gameResults = {
        "rock": { "rock": "tie", "paper": "lose", "scissors": "win", },
        "paper": { "rock": "win", "paper": "tie", "scissors": "lose", },
        "scissors": { "rock": "lose", "paper": "win", "scissors": "tie", },
    };

    let opponentResults = {
        "win": "lose",
        "lose": "win",
        "tie": "tie",
    };

    let markGameResult = function(clientId, result) {
        let client = clients[clientId];
        if (result === "win") {
            client.wins++;
        }
        else if (result === "lose") {
            client.losses++;
        }
        else {
            client.ties++;
        }
        client.socket.emit("gameResult", {
            "result": result,
        });
    };

    let finishGame = function(game) {
        let clientA = clients[game.clientA.id];
        let clientB = clients[game.clientB.id];
        let resultA = gameResults[game.clientA.input][game.clientB.input];
        markGameResult(game.clientA.id, resultA);
        markGameResult(game.clientB.id, opponentResults[resultA]);

        clientA.game = null;
        clientA.socket.emit("resetGame");
        findMatch(game.clientA.id);

        clientB.game = null;
        clientB.socket.emit("resetGame");
        findMatch(game.clientB.id);

        console.log("Finished game " + game.id + " between players " + clientAId + " (" + resultA + ") and " + clientBId + " (" + opponentResults[resultA] + ").");
    };

    let validateInput = function(input) {
        return gameResults.hasOwnProperty(input);
    }

    let handleGameInput = function(clientId, input) {
        let client = clients[clientId];

        let game = client.game;
        if (game === null) {
            return;
        }

        console.log("Recieved game input \"" + input +  "\" player " + clientId + " for game " + game.id + ".");

        let gameClient = (game.clientA.id === clientId) ? game.clientB : game.clientA;
        if (gameClient.input === null && validateInput(input)) {
            gameClient.input = input;
        }

        if (game.clientA.input !== null && game.clientB.input !== null) {
            finishGame(game);
        }
    };

    let createClient = function(socket) {
        let id = socket.id;
        clients[id] = {
            "name": socket.conn.remoteAddress,
            "socket": socket,
            "wins": 0,
            "losses": 0,
            "ties": 0,
            "game": null,
        };
        console.log("Player " + id + " connected.");
        socket.emit("resetGame");
        findMatch(id);
        return id;
    };

    let destroyClient = function(clientId) {
        let client = clients[clientId];
        console.log("Player " + clientId + " disconnected.");

        if (client.game !== null) {
            let otherId = (client.game.clientA.id === clientId) ? client.game.clientB.id : client.game.clientA.id;
            let otherClient = clients[otherId];
            console.log("Destroyed game " + client.game.id + ".");
            client.game = null;
            otherClient.game = null;
            otherClient.socket.emit("resetGame");
        }
        delete cli;ents[clientId];
    }

    io.on("connection", function(socket) {
        let clientId = createClient(socket);

        socket.on("gameInput", function(input) {
            handleGameInput(clientId, input);
        });

        socket.on("disconnect", function() {
            destroyClient(clientId);
        });
    });

    return http;
}

let host = process.argv.length >= 3 ? process.argv[2] : "0.0.0.0";
let port = process.argv.length >= 4 ? Number(process.argv[3]) : 8002;
createServer(__dirname).listen(port, host);
console.log("Server at http://" + host + ":" + port.toString() + "/");
