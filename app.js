const Twig = require("twig");
const express = require("express");
const http = require("http");
const expressSession = require("express-session");
const ent = require("ent");
let app = express();
let server = http.createServer(app);
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const session = expressSession({ secret: "todotopsecret" });
let io = require("socket.io").listen(server);

app.set("views", __dirname + "/src/template");

//##########################################//
//#########   PARTIE TODOLIST  ############//
//########################################//

// On defini que notre app utilise les sessions définit
app.use(session);

//Création d'un middleWare pour les sessions
const socketmiddleware = function(socket, next) {
  session(socket.handshake, {}, next);
};

app.get("/", function(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.render(__dirname + "/src/template/home.html.twig");
});

app.get("/todo", function(req, res) {
  res.setHeader("Content-Type", "text/html");
  if (typeof req.session.todoList == "undefined") {
    req.session.todoList = [];
  }
  res.render(__dirname + "/src/template/todoList.html.twig", {
    todoList: req.session.todoList
  });
});

app.post("/todo/add/", urlencodedParser, function(req, res) {
  if (req.body.newTodo != "") {
    req.session.todoList.push(req.body.newTodo);
  }
  res.redirect("/todo");
});

app.get("/todo/delete/:id", function(req, res) {
  if (req.params.id != "") {
    req.session.todoList.splice(req.params.id, 1);
  }
  res.redirect("/todo");
});

//##########################################//
//###########   PARTIE CHAT  ##############//
//########################################//
io.use(socketmiddleware);

io.sockets.on("connection", function(socket) {
  const session = socket.handshake.session;
  socket.pseudo = session.user;
  socket.emit("user", {
    data: session.user
  });

  socket.on("pseudoUser", function(message) {
    session.user = ent.encode(message);
    session.save(function(e) {});
    socket.broadcast.emit("newLogin", session.user);
  });

  socket.on("message", function(data) {
    socket.broadcast.emit("message", { pseudo: data.pseudo, msg: data.msg });
  });
});

app.get("/chat", function(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.render(__dirname + "/src/template/chat.html.twig");
});

app.use(express.static(__dirname + "/src"));

server.listen(8080);
