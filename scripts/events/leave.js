
const { getTime, drive } = global.utils;

module.exports = {
	config: {
		name: "leave",
		version: "2.0",
		author: "Master Charbel",
		category: "events"
	},

	langs: {
		vi: {
			session1: "sáng",
			session2: "trưa",
			session3: "chiều",
			session4: "tối",
			leaveType1: "đã tự rời",
			leaveType2: "đã bị kick khỏi",
			defaultLeaveMessage: "👋 {userName} {type} nhóm."
		},
		en: {
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			leaveType1: "a quitté",
			leaveType2: "a été expulsé de",
			defaultLeaveMessage: "👋 {userName} {type} le groupe."
		}
	},

	onStart: async ({ threadsData, message, event, api, usersData, getLang }) => {
		if (event.logMessageType !== "log:unsubscribe")
			return;

		return async function () {
			try {
				const { threadID } = event;
				const threadData = await threadsData.get(threadID);

				if (!threadData || !threadData.settings?.sendLeaveMessage)
					return;

				const { leftParticipantFbId } = event.logMessageData || {};

				if (!leftParticipantFbId)
					return;

				// Ne pas annoncer le départ du bot lui-même
				if (leftParticipantFbId == api.getCurrentUserID())
					return;

				const hours = Number(getTime("HH"));
				const threadName = threadData.threadName || "ce groupe";
				const userName = await usersData.getName(leftParticipantFbId)
					.catch(() => "Un membre");

				const isKick = leftParticipantFbId != event.author;

				let leaveMessage = threadData.data?.leaveMessage
					|| getLang("defaultLeaveMessage");

				const session = hours <= 10
					? getLang("session1")
					: hours <= 12
						? getLang("session2")
						: hours <= 18
							? getLang("session3")
							: getLang("session4");

				// Remplacer les variables du message
				leaveMessage = leaveMessage
					.replace(/\{userName\}|\{userNameTag\}/g, userName)
					.replace(/\{type\}/g, isKick
						? "a été expulsé de"
						: "a quitté")
					.replace(/\{boxName\}|\{threadName\}/g, threadName)
					.replace(/\{time\}/g, String(hours).padStart(2, "0"))
					.replace(/\{session\}/g, session);

				const form = {
					body: leaveMessage
				};

				// Mentionner le membre si demandé
				if (/\{userNameTag\}/.test(
					threadData.data?.leaveMessage || ""
				)) {
					form.mentions = [{
						tag: userName,
						id: leftParticipantFbId
					}];
				}

				// Ajouter les pièces jointes configurées
				const files = threadData.data?.leaveAttachment;

				if (Array.isArray(files) && files.length > 0) {
					const results = await Promise.allSettled(
						files.map(file => drive.getFile(file, "stream"))
					);

					const attachments = results
						.filter(result => result.status === "fulfilled")
						.map(result => result.value);

					if (attachments.length > 0)
						form.attachment = attachments;
				}

				await message.send(form);
			}
			catch (error) {
				console.error("[CHARVEX AI | LEAVE EVENT]", error);
			}
		};
	}
};
				
