import { Server } from 'socket.io';

import * as config from './config.js';

const users: Set<string> = new Set();
const rooms: { [key: string]: string[] } = {};

const isUserConnected = (username: string): boolean => users.has(username);
const isRoomAviable = (room: string): boolean => !rooms[room];

export default (io: Server) => {
    const IO = io.of('/game');

    IO.on('connection', socket => {
        const username = socket.handshake.query.username as string;
        if (!isUserConnected(username)) {
            socket.emit('usernameStatus', { success: true });
            users.add(username);

            socket.emit('UpdateRooms', rooms);

            socket.on('AddNewRoom', room => {
                if (isRoomAviable(room)) {
                    rooms[room] = [username];
                    socket.join(room);
                    IO.to(room).emit('JoinRoom', { room, connectedUsers: rooms[room] });
                    socket.broadcast.emit('UpdateRooms', rooms);
                } else {
                    socket.emit('UpdateRooms', room);
                }
            });
            socket.on('JoinRoomRequest', room => {
                if (rooms[room]?.length < config.MAXIMUM_USERS_FOR_ONE_ROOM) {
                    rooms[room].push(username);
                    socket.join(room);
                    IO.to(room).emit('JoinRoom', { room, connectedUsers: rooms[room] });
                }
            });

            socket.on('LeaveRoom', room => {
                socket.leave(room);
                rooms[room] = rooms[room].filter(item => item !== username);
                if (!rooms[room].length) {
                    delete rooms[room];
                    socket.broadcast.emit('UpdateRooms', rooms);
                } else {
                    IO.to(room).emit('LeaveRoomDone', rooms);
                }
                socket.emit('UserLeftRoom', rooms);
            });
        } else {
            socket.emit('usernameStatus', { success: false });
        }

        socket.on('disconnect', () => {
            users.delete(username);
        });
    });
};
