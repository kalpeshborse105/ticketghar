package com.kalpkrutinfotech.mahaticket.data.api

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GeminiChatService {

    suspend fun sendMessage(
        history: List<Pair<String, String>>, // (user/model, text)
        newMessage: String,
        systemContext: String
    ): String = withContext(Dispatchers.IO) {
        try {
            val response = RetrofitClient.apiService.chatWithTikitMitra(
                TikitMitraChatRequest(message = newMessage, language = "mr")
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val serverReply = response.body()?.reply
                if (!serverReply.isNullOrBlank()) {
                    return@withContext serverReply
                }
            }
        } catch (e: Exception) {
            // Graceful network or offline fallback
        }
        generateSmartLocalResponse(history, newMessage)
    }

    private fun generateSmartLocalResponse(
        history: List<Pair<String, String>>,
        message: String
    ): String {
        val lower = message.lowercase()

        return when {
            lower.contains("niyam") || lower.contains("नियम") -> {
                "🎭 'नियम व अटी लागू' (Niyam Va Ati Laagu) हे सध्याचे सर्वात लोकप्रिय कौटुंबिक नाटक आहे!\n\n" +
                        "• मुख्य कलाकार: प्रसाद ओक, मुक्ता बर्वे\n" +
                        "• दिग्दर्शक: चंद्रकांत कुलकर्णी\n" +
                        "• ठिकाण: बालगंधर्व रंगमंदिर, पुणे (J.M. Road)\n" +
                        "• वेळ: शनिवार ०५:०० PM | तिकीट: ₹३०० पासून सुरू\n\n" +
                        "तिकीट बुक करण्यासाठी खालील 'जागा निवडा' बटनावर क्लिक करा!"
            }

            lower.contains("khara") || lower.contains("खरं") -> {
                "🎭 'खरं सांगायचं तर' (Khara Sangaycha Tar) - आनंद इंगळे आणि सुकन्या कुलकर्णी यांचे उत्कृष्ट विनोदी नाटक आहे.\n\n" +
                        "• ठिकाण: यशवंतराव चव्हाण नाट्यगृह, कोथरूड, पुणे\n" +
                        "• वेळ: आज ०५:०० PM | तिकीट: ₹३०० पासून सुरू\n" +
                        "• सुविधा: कार व बाईक पार्किंग, वातानुकूलित नाट्यगृह, उपाहारगृह उपलब्ध आहेत."
            }

            lower.contains("sahi") || lower.contains("सही") -> {
                "🎭 'सही रे सही' (पुन्हा सही रे सही) - भरत जाधव यांचा एकाच नाटकात ४ भूमिकांचा विश्वविक्रमी नाट्यप्रयोग!\n\n" +
                        "• ठिकाण: प्रबोधनकार ठाकरे नाट्यगृह, मुंबई\n" +
                        "• वेळ: शनिवार ०८:३० PM | तिकीट: ₹३५० पासून सुरू\n" +
                        "• हाऊसफुल्ल होण्याआधी त्वरित तिकीट बुक करा!"
            }

            lower.contains("albtya") || lower.contains("अलबत्या") -> {
                "🎭 'अलबत्या गलबत्या' (Albatya Galbatya) - वैभव मांगले यांचे प्रसिद्ध व लोकप्रिय बालनाट्य!\n\n" +
                        "• ठिकाण: यशवंतराव चव्हाण नाट्यगृह, कोथरूड\n" +
                        "• वेळ: रविवार दु. १२:३० | तिकीट: ₹२५० पासून सुरू\n" +
                        "• संपूर्ण कुटुंबासाठी धमाल मनोरंजक नाटक!"
            }

            lower.contains("parking") || lower.contains("पार्किंग") -> {
                "🅿️ पार्किंग माहिती:\n\n" +
                        "• बालगंधर्व रंगमंदिर (पुणे): गेट क्र. ३ वरून दुचाकी व चारचाकी वाहनांसाठी प्रशस्त पार्किंग उपलब्ध आहे.\n" +
                        "• यशवंतराव चव्हाण (कोथरूड): इन-कॅम्पस पार्किंग व मेट्रो कनेक्टिव्हिटी उपलब्ध आहे.\n" +
                        "• दीनानाथ मंगेशकर (मुंबई): पे-अँड-पार्क सुविधा उपलब्ध आहे."
            }

            lower.contains("seat") || lower.contains("जागा") || lower.contains("group") || lower.contains("गट") -> {
                "🪑 आसन व्यवस्था आणि गट बुकिंग (Group Booking):\n\n" +
                        "• पांढरा रंग: उपलब्ध जागा\n" +
                        "• नारंगी रंग: आपण निवडलेली जागा\n" +
                        "• निळा रंग: आरक्षित / बुक झालेली जागा\n" +
                        "• एका वेळी आपण जास्तीत जास्त ५ जागा बुक करू शकता."
            }

            lower.contains("payment") || lower.contains("पेमेंट") || lower.contains("razorpay") || lower.contains("gst") -> {
                "💳 Razorpay १००% सुरक्षित पेमेंट:\n\n" +
                        "• UPI (Google Pay, PhonePe, Paytm), क्रेडिट/डेबिट कार्ड आणि नेटबँकिंग सपोर्टेड आहे.\n" +
                        "• सुविधा शुल्क (₹३०-३५/तिकीट) व १८% जीएसटी पारदर्शकपणे दाखवले जाते.\n" +
                        "• पेमेंट यशस्वी होताच त्वरित व्हॅलिडेटेड QR कोडसह डिजिटल तिकीट तयार होते!"
            }

            lower.contains("otp") || lower.contains("login") || lower.contains("लॉगिन") -> {
                "🔐 डिजिटल लॉगिन व OTP पडताळणी:\n\n" +
                        "आपण थेट जागा निवडून चेकआउट करू शकता. मोबाईल नंबर किंवा ईमेल टाकल्यास सुरक्षित OTP द्वारे आपले डिजिटल खाते सक्रिय होते आणि तिकिटे कायमस्वरूपी 'माझी तिकिटे' मध्ये सेव्ह राहतात."
            }

            lower.contains("qr") || lower.contains("स्कॅन") || lower.contains("scan") || lower.contains("गेट") -> {
                "📷 गेट प्रवेश आणि QR कोड व्हॅलिडेशन:\n\n" +
                        "नाट्यगृहाच्या प्रवेशद्वारावर आपल्या डिजिटल तिकिटाचा QR कोड स्कॅन केला जातो. स्कॅनर तात्काळ जागा व अतिथींची संख्या पडताळतो आणि डुप्लिकेट एंट्री रोखतो."
            }

            else -> {
                "नमस्कार! मी 'टिकिटमित्र' (TikitMitra), महाटिकिटचा AI सहाय्यक आहे. 🎭\n\n" +
                        "महाटिकिट हे कल्पकृत इन्फोटेक (Kalpkrut Infotech) चे अधिकृत तिकीट बुकिंग व्यासपीठ आहे.\n\n" +
                        "मी आपल्याला यामध्ये मदत करू शकतो:\n" +
                        "१. लोकप्रिय मराठी नाटकांची माहिती आणि प्रयोगाच्या वेळा\n" +
                        "२. कुटुंब किंवा मित्रांसाठी सलग जागा निवडणे (Group Booking)\n" +
                        "३. नाट्यगृह पार्किंग, कॅफेटेरिया आणि सुविधा माहिती\n" +
                        "४. Razorpay पेमेंट, OTP पडताळणी व QR तिकीट पावती\n\n" +
                        "आपल्याला कशाबद्दल जाणून घ्यायला आवडेल?"
            }
        }
    }
}
