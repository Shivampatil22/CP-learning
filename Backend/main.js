const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const scrape_route = require('./routes/scraper_route.js');
const { default: axios } = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

const BASE_URL = "https://codeforces.com/api";

app.use(cors());
app.use(express.json());
app.use("/api/problem", scrape_route);

let waitingList = [];
let battleRooms = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("findMatch", async ({ userDetails }) => {
        try {
            const { username, current_rating, tags } = userDetails;
            const existingIndex = waitingList.findIndex(user => user.username === username);
            if (existingIndex !== -1) {
                waitingList.splice(existingIndex, 1);
            }

            if (waitingList.length > 0) {
                let opponent = {};
                for (let i = 0; i < waitingList.length; i++) {
                    let temp = waitingList[i];
                    if (Math.abs(current_rating - temp.current_rating) <= 100) {
                        opponent = temp;
                        waitingList.splice(i, 1);
                        break;
                    }
                }

                if (opponent.username) {
                    let rating_to_play = Math.max(current_rating, opponent.current_rating);
                    const uniqueTags = [...new Set([...tags, ...opponent.tags])];
                    const randomTag = uniqueTags[Math.floor(Math.random() * uniqueTags.length)];

                    const response = await axios.get(`${BASE_URL}/problemset.problems`, {
                        params: { tags: randomTag },
                    });

                    const problems = response.data.result.problems
                        .filter(problem => problem.rating === rating_to_play)
                        .slice(0, 100);

                    if (!problems.length) {
                        throw new Error("No suitable problems found.");
                    }

                    const problem = problems[Math.floor(Math.random() * problems.length)];

                    try {
                        await axios.post(
                            `http://localhost:3000/api/problem/${problem.contestId}/${problem.index}`,
                            { problem }
                        );
                    } catch (err) {
                        console.error("Error saving problem:", err.message);
                    }

                    const roomId = `battle${socket.id}_${opponent.socketId}`;
                    const roomData = { player1: userDetails, player2: opponent, problem, roomId };
                    battleRooms[roomId] = roomData;

                    io.to(opponent.socketId).emit("matchFound", { roomId, opponent: userDetails });
                    io.to(socket.id).emit("matchFound", { roomId, opponent });
                } else {
                    waitingList.push(userDetails);
                    console.log("Waiting List:", waitingList);
                }
            } else {
                waitingList.push(userDetails);
                console.log(`User added to waiting list: ${socket.id}`);
                console.log("Waiting List:", waitingList);
            }
        } catch (err) {
            console.error("Error in findMatch:", err);
            socket.emit("matchError", { message: "Something went wrong finding a match." });
        }
    });

    socket.on("joinRoom", ({ roomId }) => {
        try {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room: ${roomId}`);
        } catch (err) {
            console.error("Error joining room:", err);
        }
    });

    socket.on("getRoomdata", ({ roomId }) => {
        try {
            socket.emit("sentRoomdata", { problem: battleRooms[roomId]?.problem });
        } catch (err) {
            console.error("Error getting room data:", err);
        }
    });

    socket.on("submitResponse", ({ response }) => {
        try {
            socket.emit("saveResponse", { response });
        } catch (err) {
            console.error("Error in submitResponse:", err);
        }
    });

    socket.on("stopFinding", () => {
        try {
            waitingList = waitingList.filter(user => user.socketId !== socket.id);
            console.log(`User stopped searching: ${socket.id}`);
        } catch (err) {
            console.error("Error in stopFinding:", err);
        }
    });

    socket.on("battleDone", ({ roomId, userId }) => {
        try {
            if (battleRooms[roomId]) {
                io.to(roomId).emit("battleWinner", { winner: userId });
                delete battleRooms[roomId];
                console.log(`Battle over. Winner: ${userId}`);
            }
        } catch (err) {
            console.error("Error in battleDone:", err);
        }
    });

    socket.on("disconnect", () => {
        try {
            waitingList = waitingList.filter(user => user.socketId !== socket.id);
            console.log(`User disconnected: ${socket.id}`);
        } catch (err) {
            console.error("Error on disconnect:", err);
        }
    });
});

const PORT = 8000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
