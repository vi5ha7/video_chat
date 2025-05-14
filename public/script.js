document.addEventListener("DOMContentLoaded", () => {
  const socket = io("/");
  const videoGrid = document.getElementById("video-grid");
  const myVideo = document.createElement("video");
  myVideo.muted = true;

  const showChat = document.querySelector("#showChat");
  const backBtn = document.querySelector(".header__back");
  const connectedUsers = {}; // Store { call, video }

  backBtn.addEventListener("click", () => {
    document.querySelector(".main__left").style.display = "flex";
    document.querySelector(".main__left").style.flex = "1";
    document.querySelector(".main__right").style.display = "none";
    document.querySelector(".header__back").style.display = "none";
  });

  showChat.addEventListener("click", () => {
    document.querySelector(".main__right").style.display = "flex";
    document.querySelector(".main__right").style.flex = "1";
    document.querySelector(".main__left").style.display = "none";
    document.querySelector(".header__back").style.display = "block";
  });

  const user = prompt("Enter your name") || "Anonymous";

  const peer = new Peer(undefined, {
    host: window.location.hostname,
    port: window.location.port || (location.protocol === 'https:' ? 443 : 80),
    path: '/peerjs',
    secure: location.protocol === 'https:',
    debug: 3
  });

  let myVideoStream;
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  }).then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on("call", (call) => {
      if (connectedUsers[call.peer]) return;

      call.answer(stream);
      const video = document.createElement("video");

      call.on("stream", (userVideoStream) => {
        if (!connectedUsers[call.peer]) {
          addVideoStream(video, userVideoStream);
          connectedUsers[call.peer] = { call, video };
        }
      });

      call.on("close", () => {
        video.remove();
        delete connectedUsers[call.peer];
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });

    socket.on("all-users", (users) => {
      users.forEach((userId) => {
        connectToNewUser(userId, stream);
      });
    });

    socket.on("user-disconnected", (userId) => {
      if (connectedUsers[userId]) {
        connectedUsers[userId].call.close();
        connectedUsers[userId].video.remove();
        delete connectedUsers[userId];
      }
    });
  });

  peer.on("open", (id) => {
    socket.emit("join-room", ROOM_ID, id, user);
  });

  const connectToNewUser = (userId, stream) => {
    if (connectedUsers[userId]) return;

    const call = peer.call(userId, stream);
    const video = document.createElement("video");

    call.on("stream", (userVideoStream) => {
      if (!connectedUsers[userId]) {
        addVideoStream(video, userVideoStream);
        connectedUsers[userId] = { call, video };
      }
    });

    call.on("close", () => {
      video.remove();
      delete connectedUsers[userId];
    });
  };

  const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play();
      videoGrid.append(video);
    });
  };

  let text = document.querySelector("#chat_message");
  let send = document.getElementById("send");
  let messages = document.querySelector(".messages");

  send.addEventListener("click", () => {
    if (text.value.length !== 0) {
      socket.emit("message", text.value);
      text.value = "";
    }
  });

  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && text.value.length !== 0) {
      socket.emit("message", text.value);
      text.value = "";
    }
  });

  const inviteButton = document.querySelector("#inviteButton");
  const muteButton = document.querySelector("#muteButton");
  const stopVideo = document.querySelector("#stopVideo");

  muteButton.addEventListener("click", () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    myVideoStream.getAudioTracks()[0].enabled = !enabled;
    muteButton.innerHTML = `<i class="fas ${enabled ? 'fa-microphone-slash' : 'fa-microphone'}"></i>`;
    muteButton.classList.toggle("background__red", enabled);
  });

  stopVideo.addEventListener("click", () => {
    const enabled = myVideoStream.getVideoTracks()[0].enabled;
    myVideoStream.getVideoTracks()[0].enabled = !enabled;
    stopVideo.innerHTML = `<i class="fas ${enabled ? 'fa-video-slash' : 'fa-video'}"></i>`;
    stopVideo.classList.toggle("background__red", enabled);
  });

  inviteButton.addEventListener("click", () => {
    prompt("Copy this link and send it to people you want to meet with", window.location.href);
  });

  socket.on("createMessage", (message, userName) => {
    const msg = document.createElement("div");
    msg.classList.add("message");
    msg.innerHTML = `
      <b><i class="far fa-user-circle"></i> <span>${userName === user ? "me" : userName}</span></b>
      <span>${message}</span>
    `;
    messages.append(msg);
  });
});
