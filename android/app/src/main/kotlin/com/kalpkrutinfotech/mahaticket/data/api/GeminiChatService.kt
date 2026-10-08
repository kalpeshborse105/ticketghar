package com.kalpkrutinfotech.mahaticket.data.api

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GeminiChatService {

    suspend fun sendMessage(
        history: List<Pair<String, String>>, // (user/model, text)
        newMessage: String,
        systemContext: String
    ): String = withContext(Dispatchers.IO) {
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
                        "• मुख्य कलाकार: संकर्षण कऱ्हाडे, अमृता देशमुख\n" +
                        "• ठिकाण: बालगंधर्व रंगमंदिर, पुणे (J.M. Road)\n" +
                        "• वेळ: आज ०४:३० PM आणि ०८:३० PM\n" +
                        "• तिकीट दर: ₹२५० ते ₹७५० (VIP)\n\n" +
                        "तुम्हाला २ किंवा अधिक जागा एकत्रित बुक करायच्या आहेत का? थेट 'थेट जागा' टॅबवर जाऊन सीट निवडा!"
            }

            lower.contains("khara") || lower.contains("खरं") -> {
                "🎭 'खरं सांगायचं तर' (Khara Sangaycha Tar) - आनंद इंगळे आणि सुकन्या कुलकर्णी यांचे उत्कृष्ट विनोदी नाटक आहे.\n\n" +
                        "• ठिकाण: यशवंतराव चव्हाण नाट्यगृह, कोथरूड, पुणे\n" +
                        "• वेळ: आज ०५:०० PM | तिकीट: ₹३०० पासून सुरू\n" +
                        "• सुविधा: कार व बाईक पार्किंग, वातानुकूलित नाट्यगृह, उपाहारगृह उपलब्ध आहेत."
            }

            lower.contains("sahi") || lower.contains("सही") -> {
                "🎭 'सही रे सही' (पुन्हा सही रे सही) - भरत जाधव यांचा एकाच नाटकात ४ भूमिकांचा विश्वविक्रमी नाट्यप्रयोग!\n\n" +
                        "• ठिकाण: मास्टर दीनानाथ मंगेशकर नाट्यगृह, विलेपार्ले, मुंबई\n" +
                        "• वेळ: शनिवार ०४:०० PM | तिकीट: ₹३५० पासून सुरू\n" +
                        "• हाऊसफुल्ल होण्याआधी त्वरित तिकीट बुक करा!"
            }

            lower.contains("parking") || lower.contains("पार्किंग") -> {
                "🅿️ पार्किंग माहिती:\n\n" +
                        "• बालगंधर्व रंगमंदिर (पुणे): गेट क्र. ३ वरून दुचाकी व चारचाकी वाहनांसाठी प्रशस्त पार्किंग उपलब्ध आहे.\n" +
                        "• यशवंतराव चव्हाण (कोथरूड): इन-कॅम्पस पार्किंग व मेट्रो कनेक्टिव्हिटी उपलब्ध आहे.\n" +
                        "• दीनानाथ मंगेशकर (मुंबई): पे-अँड-पार्क सुविधा उपलब्ध आहे."
            }

            lower.contains("seat") || lower.contains("जागा") || lower.contains("group") || lower.contains("गट") -> {
                "🪑 आसन व्यवस्था आणि गट बुकिंग (Group Booking):\n\n" +
                        "• हिरवा रंग (Green): उपलब्ध जागा\n" +
                        "• लाल रंग (Red): आरक्षित / बुक झालेली जागा\n" +
                        "• पिवळा रंग (Yellow): तुम्ही निवडलेली जागा\n" +
                        "• गट बुकिंगसाठी १ ते १० जागांचा 'Quick Group Selector' वापरा, जेणेकरून सलग शेजारील जागा आपोआप निवडल्या जातील!"
            }

            lower.contains("payment") || lower.contains("पेमेंट") || lower.contains("razorpay") || lower.contains("gst") -> {
                "💳 Razorpay तात्काळ पेमेंट पद्धत:\n\n" +
                        "• UPI (Google Pay, PhonePe, Paytm), क्रेडिट/डेबिट कार्ड आणि नेटबँकिंग सपोर्टेड आहे.\n" +
                        "• सुविधा शुल्क (₹३५/तिकीट) व १८% जीएसटी पारदर्शकपणे दाखवले जाते.\n" +
                        "• पेमेंट यशस्वी होताच त्वरित व्हॅलिडेटेड QR कोडसह डिजिटल तिकीट तयार होते!"
            }

            lower.contains("otp") || lower.contains("login") || lower.contains("लॉगिन") -> {
                "🔐 अतिथी बुकिंग व OTP पडताळणी:\n\n" +
                        "आधी लॉगिन न करता तुम्ही थेट जागा निवडू शकता. बुकिंग करताना फक्त ईमेल टाकल्यास ६-अंकी OTP येतो. पडताळणी झाल्यावर तुमचे खाते कायमस्वरूपी सेव्ह होते आणि तुम्ही कधीही तुमचे तिकीट पाहू शकता."
            }

            lower.contains("qr") || lower.contains("स्कॅन") || lower.contains("scan") || lower.contains("गेट") -> {
                "📷 गेट प्रवेश आणि QR कोड व्हॅलिडेशन:\n\n" +
                        "नाट्यगृहाच्या प्रवेशद्वारावर तुमच्या तिकिटाचा QR कोड स्कॅन केला जातो. स्कॅनर तात्काळ जागा व अतिथींची संख्या पडताळतो आणि डुप्लिकेट एंट्री रोखतो."
            }

            else -> {
                "नमस्कार! मी 'नाट्यमित्र' (NatyaMitra), MahaTicket चा AI सहाय्यक आहे. 🎭\n\n" +
                        "मी तुम्हाला यामध्ये मदत करू शकतो:\n" +
                        "१. लोकप्रिय मराठी नाटकांची शिफारस आणि प्रयोगाच्या वेळा\n" +
                        "२. कुटुंब किंवा मित्रांसाठी सलग जागा निवडणे (Group Booking)\n" +
                        "३. नाट्यगृह पार्किंग, कॅफेटेरिया आणि सुविधा माहिती\n" +
                        "४. Razorpay पेमेंट, OTP पडताळणी व QR तिकीट पावती\n\n" +
                        "तुम्हाला कशाबद्दल जाणून घ्यायला आवडेल?"
            }
        }
    }
}
