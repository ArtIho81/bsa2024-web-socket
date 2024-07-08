import { showInputModal, showMessageModal } from './views/modal.mjs';
import { appendRoomElement } from './views/room.mjs';
import { appendUserElement } from './views/user.mjs';

const username = sessionStorage.getItem('username');

if (!username) {
    window.location.replace('/signin');
}

const socket = io('http://localhost:3001/game', { query: { username } });

const roomAddButton = document.getElementById('add-room-btn');
const roomLeaveButton = document.getElementById('quit-room-btn');

socket.on('usernameStatus', ({ success }) => {
    const deleteUsername = () => {
        sessionStorage.removeItem('username');
        window.location.replace('/signin');
    };
    if (!success) {
        showMessageModal({ message: `User ${username} is already exist`, onClose: deleteUsername });
    }
});

const addNewRoom = value => {
    if (!value) {
        return;
    }
    socket.emit('AddNewRoom', value);
};

const createNewRoom = () => showInputModal({ title: 'create new room', onSubmit: addNewRoom });

roomAddButton.addEventListener('click', createNewRoom);

const changeView = (from, to) => {
    const className = 'display-none';
    document.getElementById(from).classList.add(className);
    document.getElementById(to).classList.remove(className);
};

const updateRooms = rooms => {
    const message = msg => `Room ${msg} is already exist. Try creating another room`;
    if (typeof rooms === 'string') {
        showMessageModal({ message: message(rooms), onClose: createNewRoom });
    } else {
        const roomsContainer = document.getElementById('rooms-wrapper');
        roomsContainer.innerHTML = '';
        Object.keys(rooms).forEach(room => {
            const connectedUsers = rooms[room];
            if (connectedUsers.includes(username)) {
                joinRoom(room, connectedUsers);
                return;
            }
            appendRoomElement({
                name: room,
                numberOfUsers: connectedUsers.length,
                onJoin: () => socket.emit('JoinRoomRequest', room)
            });
        });
    }
};

const appendConnectedUsers = connectedUsers => {
    document.getElementById('users-wrapper').innerHTML = '';
    connectedUsers.forEach(user => appendUserElement({ username: user, isCurrentUser: user === username }));
};

const joinRoom = (room, connectedUsers) => {
    changeView('rooms-page', 'game-page');
    const roomName = document.getElementById('room-name');
    roomName.innerHTML = room;
    appendConnectedUsers(connectedUsers);
};

socket.on('JoinRoom', joiningRoom => {
    const { room, connectedUsers } = joiningRoom;
    joinRoom(room, connectedUsers);
});

const leaveRoom = () => {
    const room = document.getElementById('room-name');
    socket.emit('LeaveRoom', room.textContent);
    socket.on('UserLeftRoom', rooms => {
        changeView('game-page', 'rooms-page');
        updateRooms(rooms);
    });
};

roomLeaveButton.addEventListener('click', leaveRoom);

const leaveRoomDone = rooms => {
    const currentRoom = document.getElementById('room-name').textContent;
    if (rooms[currentRoom]) {
        appendConnectedUsers(rooms[currentRoom]);
    } else {
        changeView('game-page', 'rooms-page');
        updateRooms(rooms);
    }
};

socket.on('LeaveRoomDone', leaveRoomDone);

socket.on('UpdateRooms', updateRooms);
