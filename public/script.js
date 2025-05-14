const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;

const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
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

const user = prompt("Enter your name");

var peer = new Peer(undefined, {
  host: window.location.hostname,
  port: 3030,
  path: '/peerjs',
  debug: 3
});

let myVideoStream;
navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
}).then((stream) => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  peer.on("call", (call) => {
    call.answer(stream);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream);
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
});

peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, user);
});

function connectToNewUser(userId, stream) {
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    videoGrid.append(video);
  });
}

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
  messages.innerHTML += `
    <div class="message">
      <b><i class="far fa-user-circle"></i> <span> ${userName === user ? "me" : userName}</span> </b>
      <span>${message}</span>
    </div>`;
});
