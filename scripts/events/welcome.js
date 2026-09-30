
const { getTime, drive } = global.utils;

if (!global.temp.welcomeEvent) {
  global.temp.welcomeEvent = {};
}

module.exports = {
  config: {
    name: "welcome",
    version: "2.0.0",
    author: "Master Charbel",
    category: "events"
  },

  langs: {
    vi: {
      session1: "sáng",
      session2: "trưa",
      session3: "chiều",
      session4: "tối",
      welcomeMessage:
        "💠 CHARVEX AI đã kết nối!\nPrefix: %1\nNhập %1help để xem lệnh.",
      multiple1: "bạn",
      multiple2: "các bạn",
      defaultWelcomeMessage:
        "Xin chào {userName}.\nChào mừng bạn đến với {boxName}.\nChúc bạn có buổi {session} vui vẻ!"
    },

    en: {
      session1: "morning",
      session2: "noon",
      session3: "afternoon",
      session4: "evening",
      welcomeMessage: [
        "╭━━〔 💠 CHARVEX AI 〕━━╮",
        "",
        "⚡ Hey everyone! I'm online.",
        "🤖 Your new group assistant is here.",
        "",
        "📌 Bot prefix: %1",
        "📚 Commands: %1help",
        "🧠 AI assistant: %1charvex",
        "⏱️ System status: %1uptime",
        "",
        "👑 Creator: Master Charbel",
        "💙 Ready to help your group!",
        "",
        "╰━━〔 SYSTEM ONLINE 〕━━╯"
      ].join("\n"),
      multiple1: "you",
      multiple2: "you guys",
      defaultWelcomeMessage:
        "Hello {userName}.\nWelcome {multiple} to the chat group: {boxName}\nHave a nice {session} 😊"
    }
  },

  onStart: async ({ threadsData, message, event, api, getLang }) => {
    if (event.logMessageType !== "log:subscribe") return;

    return async function () {
      try {
        const { threadID } = event;
        const hours = Number(getTime("HH"));
        const botID = String(api.getCurrentUserID());
        const prefix = global.utils.getPrefix(threadID);
        const addedParticipants =
          event.logMessageData?.addedParticipants || [];

        // Présentation spéciale uniquement lorsque le bot est ajouté.
        const botWasAdded = addedParticipants.some(
          item => String(item.userFbId || item.id) === botID
        );

        if (botWasAdded) {
          const nickNameBot = global.GoatBot.config.nickNameBot;

          if (nickNameBot) {
            try {
              await api.changeNickname(
                nickNameBot,
                threadID,
                botID
              );
            } catch (error) {
              console.log(
                "[CHARVEX WELCOME] Impossible de modifier le surnom :",
                error.message
              );
            }
          }

          console.log(
            `[CHARVEX WELCOME] CHARVEX ajouté au groupe ${threadID}`
          );

          return message.send(
            getLang("welcomeMessage", prefix)
          );
        }

        // Bienvenue normale pour les autres membres.
        if (!global.temp.welcomeEvent[threadID]) {
          global.temp.welcomeEvent[threadID] = {
            joinTimeout: null,
            dataAddedParticipants: []
          };
        }

        const welcomeEvent = global.temp.welcomeEvent[threadID];

        welcomeEvent.dataAddedParticipants.push(
          ...addedParticipants
        );

        clearTimeout(welcomeEvent.joinTimeout);

        welcomeEvent.joinTimeout = setTimeout(async () => {
          try {
            const threadData = await threadsData.get(threadID);

            if (threadData.settings.sendWelcomeMessage === false) {
              delete global.temp.welcomeEvent[threadID];
              return;
            }

            const participants = welcomeEvent.dataAddedParticipants;
            const banned = threadData.data.banned_ban || [];
            const threadName = threadData.threadName || "ce groupe";

            const names = [];
            const mentions = [];

            for (const user of participants) {
              if (
                banned.some(
                  item => String(item.id) === String(user.userFbId)
                )
              ) {
                continue;
              }

              names.push(user.fullName);

              mentions.push({
                tag: user.fullName,
                id: user.userFbId
              });
            }

            if (names.length === 0) {
              delete global.temp.welcomeEvent[threadID];
              return;
            }

            let {
              welcomeMessage = getLang("defaultWelcomeMessage")
            } = threadData.data;

            const form = {
              mentions: /\{userNameTag\}/.test(welcomeMessage)
                ? mentions
                : []
            };

            const session =
              hours <= 10
                ? getLang("session1")
                : hours <= 12
                  ? getLang("session2")
                  : hours <= 18
                    ? getLang("session3")
                    : getLang("session4");

            welcomeMessage = welcomeMessage
              .replace(/\{userName\}|\{userNameTag\}/g, names.join(", "))
              .replace(/\{boxName\}|\{threadName\}/g, threadName)
              .replace(
                /\{multiple\}/g,
                names.length > 1
                  ? getLang("multiple2")
                  : getLang("multiple1")
              )
              .replace(/\{session\}/g, session);

            form.body = welcomeMessage;

            if (threadData.data.welcomeAttachment?.length) {
              const files = threadData.data.welcomeAttachment;

              const results = await Promise.allSettled(
                files.map(file => drive.getFile(file, "stream"))
              );

              form.attachment = results
                .filter(result => result.status === "fulfilled")
                .map(result => result.value);
            }

            await message.send(form);

            console.log(
              `[CHARVEX WELCOME] Message envoyé dans ${threadID}`
            );
          } catch (error) {
            console.error(
              "[CHARVEX WELCOME] Erreur :",
              error
            );
          } finally {
            delete global.temp.welcomeEvent[threadID];
          }
        }, 1500);
      } catch (error) {
        console.error("[CHARVEX WELCOME] Erreur événement :", error);
      }
    };
  }
};
	
