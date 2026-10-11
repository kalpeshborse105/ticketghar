package com.kalpkrutinfotech.mahaticket.data.api

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class ChatBotResult(
    val reply: String,
    val action: TikitMitraAction? = null
)

class GeminiChatService {

    suspend fun sendMessageWithAction(
        history: List<Pair<String, String>>, // (user/model, text)
        newMessage: String,
        systemContext: String
    ): ChatBotResult = withContext(Dispatchers.IO) {
        try {
            val response = RetrofitClient.apiService.chatWithTikitMitra(
                TikitMitraChatRequest(message = newMessage, language = "mr")
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                val serverReply = body.reply.ifBlank { "आपल्या विनंतीवर प्रक्रिया झाली आहे." }
                return@withContext ChatBotResult(serverReply, body.action)
            } else {
                val errBody = response.body()?.error
                if (!errBody.isNullOrBlank()) {
                    return@withContext ChatBotResult("क्षमस्व: $errBody (कृपया पुन्हा प्रयत्न करा)")
                }
            }
        } catch (e: Exception) {
            return@withContext ChatBotResult("क्षमस्व, टिकिटमित्र AI सर्व्हरशी संपर्क होऊ शकला नाही. कृपया आपले इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.")
        }
        ChatBotResult("क्षमस्व, उत्तर मिळवण्यात अडचण आली. कृपया काही वेळाने पुन्हा प्रयत्न करा.")
    }

    suspend fun sendMessage(
        history: List<Pair<String, String>>,
        newMessage: String,
        systemContext: String
    ): String = sendMessageWithAction(history, newMessage, systemContext).reply
}
