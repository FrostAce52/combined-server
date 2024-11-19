import mysql from "mysql2/promise";

const connectedUsers = new Map();
const messageHistory = [];
const MAX_HISTORY = 100;

const chatController = (io) => {
  // Create connection pool using environment variables
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  io.on("connection", async (socket) => {
    console.log("A user connected:", socket.id);

    // Send message history to newly connected user
    socket.emit("message_history", messageHistory);

    // Handle user joining
    socket.on("user_join", async (userData) => {
      connectedUsers.set(socket.id, userData);

      const joinMessage = {
        type: "system",
        text: `${userData.nickname} 已加入`,
        timestamp: new Date().toISOString(),
      };

      try {
        // Store system message in database with NULL member_id
        const [result] = await pool.execute(
          "INSERT INTO s_chat (s_unique_id, s_chat) VALUES (?, ?)",
          [socket.id, joinMessage.text]
        );

        messageHistory.push(joinMessage);
        io.emit("receive_message", joinMessage);
      } catch (error) {
        console.error("Error storing join message:", error);
      }
    });

    // Handle messages
    socket.on("send_message", async (data) => {
      const messageWithTimestamp = {
        ...data,
        type: "user",
        serverTimestamp: new Date().toISOString(),
      };

      try {
        // Store user message in database
        // Note: s_chat_member will default to NULL as per MySQL table definition
        const [result] = await pool.execute(
          "INSERT INTO s_chat (s_unique_id, s_chat) VALUES (?, ?)",
          [socket.id, data.text]
        );

        /*
        Future options for s_chat_member:
        1. m_member_id from m_member table
        2. data.userId (after validation)
        3. A reference to f_project_id if implementing project-specific chats
        4. A reference to s_stream_id if implementing stream-specific chats
        
        Example with member_id:
        INSERT INTO s_chat (s_unique_id, s_chat_member, s_chat) 
        VALUES (?, (SELECT m_member_id FROM m_member WHERE m_account = ?), ?)
        */

        messageHistory.push(messageWithTimestamp);

        if (messageHistory.length > MAX_HISTORY) {
          messageHistory.shift();
        }

        io.emit("receive_message", messageWithTimestamp);
      } catch (error) {
        console.error("Error storing message:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      const userData = connectedUsers.get(socket.id);
      if (userData) {
        const leaveMessage = {
          type: "system",
          text: `${userData.nickname} 已離開`,
          timestamp: new Date().toISOString(),
        };

        try {
          // Store leave message in database
          const [result] = await pool.execute(
            "INSERT INTO s_chat (s_unique_id, s_chat) VALUES (?, ?)",
            [socket.id, leaveMessage.text]
          );

          messageHistory.push(leaveMessage);
          io.emit("receive_message", leaveMessage);
          connectedUsers.delete(socket.id);
        } catch (error) {
          console.error("Error storing leave message:", error);
        }
      }
      console.log("User disconnected:", socket.id);
    });
  });
};

export default chatController;
