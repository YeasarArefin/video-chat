const express = require('express');
const http = require('http');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const { log } = require('console');
app.use(cors());

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

let users = [];

io.on('connection', (socket) => {
    console.log('joined :', socket.id);
    socket.on('join_room', ({ room, name }) => {
        socket.join(room);
        const existingUsers = users.map(user => user.name).join(', ');

        socket.emit('message', { author: 'System', message: `You just joined the chat` });

        if (users.length === 1) {
            socket.emit('message', { author: 'System', message: `${existingUsers} have already joined the chat` });
        } else if (users.length > 1) {
            socket.emit('message', { author: 'System', message: `${existingUsers} they have already joined the chat` });
        }
        socket.broadcast.to(room).emit('message', { author: 'System', message: `${name} just joined the chat` });
        users.push({ id: socket.id, name, room });
    });

    socket.on('send_message', (data) => {
        socket.to(data.room).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        const disconnectedUser = users.filter((user) => user.id === socket.id);
        users = users.filter((user) => user.id !== socket.id);
        console.log("🚀 ~ socket.on ~ disconnectedUser:", disconnectedUser);
        socket.broadcast.emit('message', { author: 'System', message: `${disconnectedUser[0]?.name} just left the chat` });
        console.log('disconnected :', socket.id);
    });
    /*----------------------------------------------------------------------------------------------------------*/
    socket.emit("me", socket.id);

    socket.on("disconnect", () => {
        socket.broadcast.emit("callEnded");
    });

    socket.on("callUser", (data) => {
        io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name });
    });

    socket.on("answerCall", (data) => {
        io.to(data.to).emit("callAccepted", data.signal);
    });
});

app.get('/', (req, res) => res.send('money chat server running'));

server.listen(port, () => console.log('server running at port 5000'));