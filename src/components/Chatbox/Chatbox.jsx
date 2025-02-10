import React, { useContext, useEffect, useState } from "react";
import "./Chatbox.css";
import assets from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { toast } from "react-toastify";
import upload from "../../lib/upload";

function Chatbox() {
  const {
    userData,
    messagesId,
    chatUser,
    messages,
    setMessages,
    chatVisible,
    setChatVisible,
  } = useContext(AppContext);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim() || !messagesId) return;

    try {
      const messageData = {
        sId: userData.id,
        text: input,
        createdAt: new Date(),
      };

      await updateDoc(doc(db, "messages", messagesId), {
        messages: arrayUnion(messageData),
      });

      const userIDs = [userData.id, chatUser.userData.id];

      for (const id of userIDs) {
        const userChatsRef = doc(db, "chats", id);
        const userChatsSnapshot = await getDoc(userChatsRef);

        if (userChatsSnapshot.exists()) {
          let userChatData = userChatsSnapshot.data();
          if (!userChatData.chatsData) {
            userChatData.chatsData = [];
          }
          let chatIndex = userChatData.chatsData.findIndex(
            (c) => c.messageId === messagesId
          );

          if (chatIndex !== -1) {
            userChatData.chatsData[chatIndex] = {
              ...userChatData.chatsData[chatIndex],
              lastMessage: input.slice(0, 30),
              updatedAt: Date.now(),
              messageSeen:
                userChatData.chatsData[chatIndex].rId !== userData.id,
            };
            await updateDoc(userChatsRef, {
              chatsData: userChatData.chatsData,
            });
          }
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
    setInput("");
  };

  const convertTimeStamp = (timestamp) => {
    if (!timestamp?.toDate) return "";
    let date = timestamp.toDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let amPm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;
    minute = minute.toString().padStart(2, "0");

    return `${hour}:${minute} ${amPm}`;
  };

  const sendImage = async (e) => {
    try {
      const fileUrl = await upload(e.target.files[0]);

      if (fileUrl && messagesId) {
        await updateDoc(doc(db, "messages", messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            image: fileUrl,
            createdAt: new Date(),
          }),
        });

        const userIDs = [userData.id, chatUser.userData.id];

        for (const id of userIDs) {
          const userChatsRef = doc(db, "chats", id);
          const userChatsSnapshot = await getDoc(userChatsRef);

          if (userChatsSnapshot.exists()) {
            let userChatData = userChatsSnapshot.data();
            if (!userChatData.chatsData) {
              userChatData.chatsData = [];
            }
            let chatIndex = userChatData.chatsData.findIndex(
              (c) => c.messageId === messagesId
            );

            if (chatIndex !== -1) {
              userChatData.chatsData[chatIndex] = {
                ...userChatData.chatsData[chatIndex],
                lastMessage: "Image",
                updatedAt: Date.now(),
                messageSeen:
                  userChatData.chatsData[chatIndex].rId !== userData.id,
              };
              await updateDoc(userChatsRef, {
                chatsData: userChatData.chatsData,
              });
            }
          }
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (!messagesId) return;
    const unSub = onSnapshot(doc(db, "messages", messagesId), (res) => {
      setMessages(res.data()?.messages?.reverse() || []);
    });
    return () => unSub();
  }, [messagesId, setMessages]);

  return chatUser ? (
    <div className={`chat-box ${chatVisible ? "" : "hidden"}`}>
      <div className="chat-user">
        <img src={chatUser.userData.avatar} alt="User Avatar" />
        <p>
          {chatUser.userData.name}{" "}
          {Date.now() - chatUser.userData.lastSeen <= 70000 ? (
            <img src={assets.green_dot} alt="Online Status" className="dot" />
          ) : null}
        </p>
        <img src={assets.help} className="help" alt="Help" />
        <img
          onClick={() => setChatVisible(false)}
          src={assets.leftArrow}
          className="arrow"
          alt=""
        />
      </div>

      <div className="chat-msg">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.sId === userData.id ? "s-msg" : "r-msg"}
          >
            {msg["image"] ? (
              <img className="msg-img" src={msg.image} alt="" />
            ) : (
              msg.text && <p className="msg">{msg.text}</p>
            )}
            <div>
              <img
                src={
                  msg.sId === userData.id
                    ? userData.avatar
                    : chatUser.userData.avatar
                }
                alt="User"
              />
              <p>{convertTimeStamp(msg.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Send a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <input
          onChange={sendImage}
          type="file"
          id="image"
          accept="image/png, image/jpeg"
          hidden
        />
        <label htmlFor="image">
          <img src={assets.gallery} alt="Gallery" />
        </label>
        <img onClick={sendMessage} src={assets.send} alt="Send" />
      </div>
    </div>
  ) : (
    <div className={`chat-welcome ${chatVisible ? "" : "hidden"}`}>
      <img src={assets.bigChat} alt="Welcome" />
      <p>Chat anytime, anywhere</p>
    </div>
  );
}

export default Chatbox;
