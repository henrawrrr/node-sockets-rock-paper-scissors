let socket = io();

let appendMessage = function(message) {
    $("#messages").append($("<li>").text(message));
};

socket.on("resetGame", function() {
    appendMessage("waiting for game...");
});

socket.on("startGame", function(info) {
    appendMessage("matched with player: " + info.opponentName + ". game id: " + info.gameId);
});

socket.on("gameResult", function(result) {
    appendMessage("game result: " + result.result + ".");
});

$("#rock").click(function() {
    socket.emit("gameInput", "rock");
});

$("#paper").click(function() {
    socket.emit("gameInput", "paper");
});

$("#scissors").click(function() {
    socket.emit("gameInput", "scissors");
});
