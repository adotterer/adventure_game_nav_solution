const http = require("http");
const fs = require("fs");

const { Player } = require("./game/class/player");
const { World } = require("./game/class/world");

const worldData = require("./game/data/basic-world-data");

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const html = fs.readFileSync("./views/new-player.html");
    res.setHeader("Content-Type", "text/html");
    return res.end(html);
  }

  if (req.method === "GET" && req.url.startsWith("/rooms/")) {
    const [__empty, __rooms, number, direction] = req.url.split("/");
    if (number && !direction) {
      const html = fs.readFileSync("./views/room.html", "utf-8");

      const updatedHtml = html
        .replace(/#{roomName}/g, player.currentRoom.name)
        .replace(/#{inventory}/g, player.inventoryToString())
        .replace(/#{roomItems}/g, player.currentRoom.itemsToString())
        .replace(/#{exits}/g, player.currentRoom.exitsToString());

      res.setHeader("Content-Type", "text/html");
      res.end(updatedHtml);
      return;
    } else if (number && direction) {
      let nextRoom = player.move(direction.slice(0, 1));
      res.statusCode = 302;

      res.setHeader("Location", `/rooms/${Number(nextRoom.id)}`);
      res.end();
      return;
    }
  }

  let reqBody = "";

  req.on("data", (data) => {
    reqBody += data;
  });

  req.on("end", () => {
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

      // ONLY POST REQUESTS WITH BODIES GO HERE
      // ---> the req.body is now turned into a usable object
      if (req.method === "POST" && req.url === "/player") {
        const { name } = req.body;
        const currentRoom = world.rooms[2];
        player = new Player(name, currentRoom);
        res.statusCode = 302;
        res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
        return res.end();
      }
    } else {
      // THESE POST REQUESTS *DO NOT* HAVE BODIES
      // reqBody is an empty string
      // therefore, use the req.url to get the item id and action
      if (req.method === "POST" && req.url.startsWith("/items/")) {
        const [__empty, __items, itemId, action] = req.url.split("/");
        // HELPER FUCNTION TO RELOAD PAGES
        const reloadPage = function () {
          res.statusCode = 302;
          res.setHeader("Location", `/rooms/${Number(player.currentRoom.id)}`);
          res.end();
          return;
        };
        // SWITCH STATEMENT FOR ACTIONS
        switch (action) {
          case "take":
            player.takeItem(itemId);
            reloadPage();
            break;
          case "eat":
            player.eatItem(itemId);
            reloadPage();
            break;
          case "drop":
            player.dropItem(itemId);
            reloadPage();
            break;
          default:
            const errorPage = fs.readFile("./views/error.html");
            res.setHeader("Content-Type", "text/html");
            return res.end(errorPage);
        }
      }
    }
  });
});

const port = 5000;

server.listen(port, () => console.log("Server is listening on port", port));
