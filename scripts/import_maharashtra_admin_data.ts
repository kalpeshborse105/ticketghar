import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * ==============================================================================
 * MAHATICKET - MAHARASHTRA ADMINISTRATIVE DATASET IMPORT
 * ==============================================================================
 * 
 * PROVENANCE & SOURCE METADATA:
 * ------------------------------------------------------------------------------
 * - Official Primary Source: Government of Maharashtra (maharashtra.gov.in)
 * - Administrative Source: Directorate of Economics & Statistics Maharashtra /
 *                          Ministry of Panchayati Raj Local Government Directory (LGD)
 * - Census Reference: Census of India Administrative Atlas of Maharashtra
 * - Dataset Revision: 2024-2026 Official Administrative Updates (Gazette renames:
 *                     Chhatrapati Sambhajinagar, Dharashiv, Ahilyanagar)
 * - Structure:
 *     * 36 Official Districts across 6 Administrative Divisions
 *     * 358 Official Talukas (Sub-districts)
 *     * Major Cities, Urban Local Bodies, Municipal Corporations & Taluka Towns
 * ==============================================================================
 */

export interface TalukaSeed {
  name: string;
  nameMr: string;
}

export interface CitySeed {
  name: string;
  nameMr: string;
  districtCode: string;
  talukaName?: string;
  isPopular?: number;
  sortOrder?: number;
}

export const MAHARASHTRA_TALUKAS: Record<string, TalukaSeed[]> = {
  // 1. Konkan Division (7 Districts)
  'MH-MC': [
    { name: 'Mumbai City', nameMr: 'मुंबई शहर' }
  ],
  'MH-MS': [
    { name: 'Kurla', nameMr: 'कुर्ला' },
    { name: 'Andheri', nameMr: 'अंधेरी' },
    { name: 'Borivali', nameMr: 'बोरिवली' }
  ],
  'MH-TH': [
    { name: 'Thane', nameMr: 'ठाणे' },
    { name: 'Kalyan', nameMr: 'कल्याण' },
    { name: 'Murbad', nameMr: 'मुरबाड' },
    { name: 'Bhiwandi', nameMr: 'भिवंडी' },
    { name: 'Shahapur', nameMr: 'शहापूर' },
    { name: 'Ulhasnagar', nameMr: 'उल्हासनगर' },
    { name: 'Ambarnath', nameMr: 'अंबरनाथ' }
  ],
  'MH-PL': [
    { name: 'Palghar', nameMr: 'पालघर' },
    { name: 'Vasai', nameMr: 'वसई' },
    { name: 'Dahanu', nameMr: 'डहाणू' },
    { name: 'Talasari', nameMr: 'तलासरी' },
    { name: 'Jawhar', nameMr: 'जव्हार' },
    { name: 'Mokhada', nameMr: 'मोखाडा' },
    { name: 'Vada', nameMr: 'वाडा' },
    { name: 'Vikramgad', nameMr: 'विक्रमगड' }
  ],
  'MH-RG': [
    { name: 'Alibag', nameMr: 'अलिबाग' },
    { name: 'Panvel', nameMr: 'पनवेल' },
    { name: 'Uran', nameMr: 'उरण' },
    { name: 'Karjat', nameMr: 'कर्जत' },
    { name: 'Khalapur', nameMr: 'खालापूर' },
    { name: 'Pen', nameMr: 'पेण' },
    { name: 'Sudhagad', nameMr: 'सुधागड' },
    { name: 'Roha', nameMr: 'रोहा' },
    { name: 'Mangaon', nameMr: 'माणगाव' },
    { name: 'Tala', nameMr: 'तळा' },
    { name: 'Mahad', nameMr: 'महाड' },
    { name: 'Mhasla', nameMr: 'म्हसळा' },
    { name: 'Shrivardhan', nameMr: 'श्रीवर्धन' },
    { name: 'Poladpur', nameMr: 'पोलादपूर' },
    { name: 'Murud', nameMr: 'मुरुड' }
  ],
  'MH-RT': [
    { name: 'Ratnagiri', nameMr: 'रत्नागिरी' },
    { name: 'Chiplun', nameMr: 'चिपळूण' },
    { name: 'Dapoli', nameMr: 'दापोली' },
    { name: 'Khed', nameMr: 'खेड' },
    { name: 'Guhagar', nameMr: 'गुहागर' },
    { name: 'Sangameshwar', nameMr: 'संगमेश्वर' },
    { name: 'Lanja', nameMr: 'लांजा' },
    { name: 'Rajapur', nameMr: 'राजापूर' },
    { name: 'Mandangad', nameMr: 'मंडणगड' }
  ],
  'MH-SD': [
    { name: 'Kankavli', nameMr: 'कणकवली' },
    { name: 'Sawantwadi', nameMr: 'सावंतवाडी' },
    { name: 'Kudal', nameMr: 'कुडाळ' },
    { name: 'Malvan', nameMr: 'मालवण' },
    { name: 'Vengurla', nameMr: 'वेंगुर्ला' },
    { name: 'Devgad', nameMr: 'देवगड' },
    { name: 'Vaibhavwadi', nameMr: 'वैभववाडी' },
    { name: 'Dodamarg', nameMr: 'दोडामार्ग' }
  ],

  // 2. Pune Division (5 Districts)
  'MH-PU': [
    { name: 'Pune City', nameMr: 'पुणे शहर' },
    { name: 'Haveli', nameMr: 'हवेली' },
    { name: 'Khed', nameMr: 'खेड' },
    { name: 'Ambegaon', nameMr: 'आंबेगाव' },
    { name: 'Junnar', nameMr: 'जुन्नर' },
    { name: 'Shirur', nameMr: 'शिरूर' },
    { name: 'Daund', nameMr: 'दौंड' },
    { name: 'Indapur', nameMr: 'इंदापूर' },
    { name: 'Baramati', nameMr: 'बारामती' },
    { name: 'Purandar', nameMr: 'पुरंदर' },
    { name: 'Bhor', nameMr: 'भोर' },
    { name: 'Velhe', nameMr: 'वेल्हे' },
    { name: 'Maval', nameMr: 'मावळ' },
    { name: 'Mulshi', nameMr: 'मुळशी' }
  ],
  'MH-ST': [
    { name: 'Satara', nameMr: 'सातारा' },
    { name: 'Karad', nameMr: 'कराड' },
    { name: 'Wai', nameMr: 'वाई' },
    { name: 'Mahabaleshwar', nameMr: 'महाबळेश्वर' },
    { name: 'Phaltan', nameMr: 'फलटण' },
    { name: 'Koregaon', nameMr: 'कोरेगाव' },
    { name: 'Khatav', nameMr: 'खटाव' },
    { name: 'Maan', nameMr: 'माण' },
    { name: 'Patan', nameMr: 'पाटण' },
    { name: 'Jaoli', nameMr: 'जावळी' },
    { name: 'Khandala', nameMr: 'खंडाळा' }
  ],
  'MH-SN': [
    { name: 'Miraj', nameMr: 'मिरज' },
    { name: 'Tasgaon', nameMr: 'तासगाव' },
    { name: 'Khanapur', nameMr: 'खानापूर' },
    { name: 'Walwa', nameMr: 'वाळवा' },
    { name: 'Shirala', nameMr: 'शिराळा' },
    { name: 'Jat', nameMr: 'जत' },
    { name: 'Kavathe Mahankal', nameMr: 'कवठे महांकाळ' },
    { name: 'Atpadi', nameMr: 'आटपाडी' },
    { name: 'Palus', nameMr: 'पलूस' },
    { name: 'Kadegaon', nameMr: 'कडेगाव' }
  ],
  'MH-SO': [
    { name: 'Solapur North', nameMr: 'उत्तर सोलापूर' },
    { name: 'Solapur South', nameMr: 'दक्षिण सोलापूर' },
    { name: 'Barshi', nameMr: 'बार्शी' },
    { name: 'Akkalkot', nameMr: 'अक्कलकोट' },
    { name: 'Mohol', nameMr: 'मोहोळ' },
    { name: 'Pandharpur', nameMr: 'पंढरपूर' },
    { name: 'Malshiras', nameMr: 'माळशिरस' },
    { name: 'Karmala', nameMr: 'करमाळा' },
    { name: 'Madha', nameMr: 'माढा' },
    { name: 'Sangole', nameMr: 'सांगोले' },
    { name: 'Mangalwedha', nameMr: 'मंगळवेढा' }
  ],
  'MH-KO': [
    { name: 'Karveer', nameMr: 'करवीर' },
    { name: 'Hatkanangale', nameMr: 'हातकणंगले' },
    { name: 'Shirol', nameMr: 'शिरोळ' },
    { name: 'Kagal', nameMr: 'कागल' },
    { name: 'Gadhinglaj', nameMr: 'गडहिंग्लज' },
    { name: 'Panhala', nameMr: 'पन्हाळा' },
    { name: 'Shahuwadi', nameMr: 'शाहूवाडी' },
    { name: 'Radhanagari', nameMr: 'राधानगरी' },
    { name: 'Bhudargad', nameMr: 'भुदरगड' },
    { name: 'Ajra', nameMr: 'आजरा' },
    { name: 'Chandgad', nameMr: 'चंदगड' },
    { name: 'Gaganbawda', nameMr: 'गगनबावडा' }
  ],

  // 3. Nashik Division (5 Districts)
  'MH-NS': [
    { name: 'Nashik', nameMr: 'नाशिक' },
    { name: 'Sinnar', nameMr: 'सिन्नर' },
    { name: 'Igatpuri', nameMr: 'इगतपुरी' },
    { name: 'Dindori', nameMr: 'दिंडोरी' },
    { name: 'Niphad', nameMr: 'निफाड' },
    { name: 'Yevala', nameMr: 'येवला' },
    { name: 'Nandgaon', nameMr: 'नांदगाव' },
    { name: 'Chandwad', nameMr: 'चांदवड' },
    { name: 'Kalwan', nameMr: 'कळवण' },
    { name: 'Baglan', nameMr: 'बागलाण' },
    { name: 'Malegaon', nameMr: 'मालेगाव' },
    { name: 'Deola', nameMr: 'देवळा' },
    { name: 'Surgana', nameMr: 'सुरगाणा' },
    { name: 'Peth', nameMr: 'पेठ' },
    { name: 'Trimbakeshwar', nameMr: 'त्र्यंबकेश्वर' }
  ],
  'MH-AH': [
    { name: 'Nagar', nameMr: 'नगर' },
    { name: 'Rahuri', nameMr: 'राहुरी' },
    { name: 'Shrirampur', nameMr: 'श्रीरामपूर' },
    { name: 'Nevasa', nameMr: 'नेवासा' },
    { name: 'Shevgaon', nameMr: 'शेवगाव' },
    { name: 'Pathardi', nameMr: 'पाथर्डी' },
    { name: 'Jamkhed', nameMr: 'जामखेड' },
    { name: 'Karjat', nameMr: 'कर्जत' },
    { name: 'Shrigonda', nameMr: 'श्रीगोंदा' },
    { name: 'Parner', nameMr: 'पारनेर' },
    { name: 'Akole', nameMr: 'अकोले' },
    { name: 'Sangamner', nameMr: 'संगमनेर' },
    { name: 'Kopargaon', nameMr: 'कोपरगाव' },
    { name: 'Rahata', nameMr: 'राहाता' }
  ],
  'MH-DH': [
    { name: 'Dhule', nameMr: 'धुळे' },
    { name: 'Sakri', nameMr: 'साक्री' },
    { name: 'Sindkheda', nameMr: 'शिंदखेडा' },
    { name: 'Shirpur', nameMr: 'शिरपूर' }
  ],
  'MH-JL': [
    { name: 'Jalgaon', nameMr: 'जळगाव' },
    { name: 'Bhusawal', nameMr: 'भुसावळ' },
    { name: 'Chalisgaon', nameMr: 'चाळीसगाव' },
    { name: 'Pachora', nameMr: 'पाचोरा' },
    { name: 'Amalner', nameMr: 'अमळनेर' },
    { name: 'Chopda', nameMr: 'चोपडा' },
    { name: 'Erandol', nameMr: 'एरंडोल' },
    { name: 'Dharangaon', nameMr: 'धरणगाव' },
    { name: 'Jamner', nameMr: 'जामनेर' },
    { name: 'Parola', nameMr: 'पारोळा' },
    { name: 'Raver', nameMr: 'रावेर' },
    { name: 'Yawal', nameMr: 'यावल' },
    { name: 'Muktainagar', nameMr: 'मुक्ताईनगर' },
    { name: 'Bodwad', nameMr: 'बोधवड' },
    { name: 'Bhadgaon', nameMr: 'भडगाव' }
  ],
  'MH-ND': [
    { name: 'Nandurbar', nameMr: 'नंदुरबार' },
    { name: 'Shahada', nameMr: 'शहादा' },
    { name: 'Taloda', nameMr: 'तळोदा' },
    { name: 'Akkalkuwa', nameMr: 'अक्कलकुवा' },
    { name: 'Navapur', nameMr: 'नवापूर' },
    { name: 'Akrani', nameMr: 'अक्राणी' }
  ],

  // 4. Chhatrapati Sambhajinagar Division (8 Districts)
  'MH-CS': [
    { name: 'Chhatrapati Sambhajinagar', nameMr: 'छत्रपती संभाजीनगर' },
    { name: 'Paithan', nameMr: 'पैठण' },
    { name: 'Vaijapur', nameMr: 'वैजापूर' },
    { name: 'Gangapur', nameMr: 'गंगापूर' },
    { name: 'Sillod', nameMr: 'सिल्लोड' },
    { name: 'Kannad', nameMr: 'कन्नड' },
    { name: 'Khuldabad', nameMr: 'खुलताबाद' },
    { name: 'Phulambri', nameMr: 'फुलंब्री' },
    { name: 'Soegaon', nameMr: 'सोयगाव' }
  ],
  'MH-JN': [
    { name: 'Jalna', nameMr: 'जालना' },
    { name: 'Ambad', nameMr: 'अंबड' },
    { name: 'Bhokardan', nameMr: 'भोकरदन' },
    { name: 'Partur', nameMr: 'परतूर' },
    { name: 'Jafrabad', nameMr: 'जाफ्राबाद' },
    { name: 'Badnapur', nameMr: 'बदनपूर' },
    { name: 'Ghansawangi', nameMr: 'घनसावंगी' },
    { name: 'Mantha', nameMr: 'मंठा' }
  ],
  'MH-BD': [
    { name: 'Beed', nameMr: 'बीड' },
    { name: 'Georai', nameMr: 'गेवराई' },
    { name: 'Majalgaon', nameMr: 'माजलगाव' },
    { name: 'Ambajogai', nameMr: 'अंबाजोगाई' },
    { name: 'Kaij', nameMr: 'केज' },
    { name: 'Parli', nameMr: 'परळी' },
    { name: 'Ashti', nameMr: 'आष्टी' },
    { name: 'Patoda', nameMr: 'पाटोदा' },
    { name: 'Shirur-Kasar', nameMr: 'शिरूर कासार' },
    { name: 'Wadwani', nameMr: 'वडवणी' },
    { name: 'Dharur', nameMr: 'धारूर' }
  ],
  'MH-DR': [
    { name: 'Dharashiv', nameMr: 'धाराशिव' },
    { name: 'Tuljapur', nameMr: 'तुळजापूर' },
    { name: 'Omerga', nameMr: 'उमरगा' },
    { name: 'Kalamb', nameMr: 'कळंब' },
    { name: 'Bhum', nameMr: 'भूम' },
    { name: 'Paranda', nameMr: 'परांडा' },
    { name: 'Lohara', nameMr: 'लोहारा' },
    { name: 'Washi', nameMr: 'वाशी' }
  ],
  'MH-NA': [
    { name: 'Nanded', nameMr: 'नांदेड' },
    { name: 'Ardhapur', nameMr: 'अर्धापूर' },
    { name: 'Mudkhed', nameMr: 'मुदखेड' },
    { name: 'Bhokar', nameMr: 'भोकर' },
    { name: 'Umri', nameMr: 'उमरी' },
    { name: 'Loha', nameMr: 'लोहा' },
    { name: 'Kandhar', nameMr: 'कंधार' },
    { name: 'Kinwat', nameMr: 'किनवट' },
    { name: 'Himayatnagar', nameMr: 'हिमायतनगर' },
    { name: 'Hadgaon', nameMr: 'हदगाव' },
    { name: 'Mahoor', nameMr: 'माहूर' },
    { name: 'Degloor', nameMr: 'देगलूर' },
    { name: 'Mukhed', nameMr: 'मुखेड' },
    { name: 'Dharmabad', nameMr: 'धर्माबाद' },
    { name: 'Biloli', nameMr: 'बिलोली' },
    { name: 'Naigaon', nameMr: 'नायगाव' }
  ],
  'MH-LA': [
    { name: 'Latur', nameMr: 'लातूर' },
    { name: 'Udgir', nameMr: 'उदगीर' },
    { name: 'Ahmedpur', nameMr: 'अहमदपूर' },
    { name: 'Ausa', nameMr: 'औसा' },
    { name: 'Nilanga', nameMr: 'निलंगा' },
    { name: 'Renapur', nameMr: 'रेणापूर' },
    { name: 'Chakur', nameMr: 'चाकूर' },
    { name: 'Deoni', nameMr: 'देवणी' },
    { name: 'Shirur-Anantpal', nameMr: 'शिरूर अनंतपाळ' },
    { name: 'Jalkot', nameMr: 'जलकोट' }
  ],
  'MH-PR': [
    { name: 'Parbhani', nameMr: 'परभणी' },
    { name: 'Gangakhed', nameMr: 'गंगाखेड' },
    { name: 'Jintur', nameMr: 'जिंतूर' },
    { name: 'Purna', nameMr: 'पूर्णा' },
    { name: 'Sailu', nameMr: 'सेलू' },
    { name: 'Pathri', nameMr: 'पाथरी' },
    { name: 'Manwath', nameMr: 'मानवत' },
    { name: 'Sonpeth', nameMr: 'सोनपेठ' },
    { name: 'Palam', nameMr: 'पालम' }
  ],
  'MH-HG': [
    { name: 'Hingoli', nameMr: 'हिंगोली' },
    { name: 'Basmath', nameMr: 'वसमत' },
    { name: 'Kalamnuri', nameMr: 'कलमनुरी' },
    { name: 'Sengaon', nameMr: 'सेनगाव' },
    { name: 'Aundha Nagnath', nameMr: 'औंढा नागनाथ' }
  ],

  // 5. Amravati Division (5 Districts)
  'MH-AM': [
    { name: 'Amravati', nameMr: 'अमरावती' },
    { name: 'Achalpur', nameMr: 'अचलपूर' },
    { name: 'Morshi', nameMr: 'मोर्शी' },
    { name: 'Warud', nameMr: 'वरुड' },
    { name: 'Daryapur', nameMr: 'दर्यापूर' },
    { name: 'Anjangaon Surji', nameMr: 'अंजनगाव सुर्जी' },
    { name: 'Chandurbazar', nameMr: 'चांदूरबाजार' },
    { name: 'Chandur Railway', nameMr: 'चांदूर रेल्वे' },
    { name: 'Dhamangaon Railway', nameMr: 'धामणगाव रेल्वे' },
    { name: 'Bhatkuli', nameMr: 'भातकुली' },
    { name: 'Nandgaon Khandeshwar', nameMr: 'नांदगाव खंडेश्वर' },
    { name: 'Teosa', nameMr: 'तिवसा' },
    { name: 'Dharni', nameMr: 'धारणी' },
    { name: 'Chikhaldara', nameMr: 'चिखलदरा' }
  ],
  'MH-AK': [
    { name: 'Akola', nameMr: 'अकोला' },
    { name: 'Akot', nameMr: 'अकोट' },
    { name: 'Murtizapur', nameMr: 'मूर्तिजापूर' },
    { name: 'Balapur', nameMr: 'बाळापूर' },
    { name: 'Telhara', nameMr: 'तेल्हारा' },
    { name: 'Patur', nameMr: 'पातूर' },
    { name: 'Barshitakli', nameMr: 'बार्शीटाकळी' }
  ],
  'MH-BU': [
    { name: 'Buldhana', nameMr: 'बुलढाणा' },
    { name: 'Khamgaon', nameMr: 'खामगाव' },
    { name: 'Malkapur', nameMr: 'मलकापूर' },
    { name: 'Shegaon', nameMr: 'शेगाव' },
    { name: 'Chikhli', nameMr: 'चिखली' },
    { name: 'Mehkar', nameMr: 'मेहकर' },
    { name: 'Nandura', nameMr: 'नांदुरा' },
    { name: 'Jalgaon Jamod', nameMr: 'जळगाव जामोद' },
    { name: 'Deulgaon Raja', nameMr: 'देऊळगाव राजा' },
    { name: 'Sindkhed Raja', nameMr: 'सिंदखेड राजा' },
    { name: 'Lonar', nameMr: 'लोणार' },
    { name: 'Motala', nameMr: 'मोताळा' },
    { name: 'Sangrampur', nameMr: 'संग्रामपूर' }
  ],
  'MH-YA': [
    { name: 'Yavatmal', nameMr: 'यवतमाळ' },
    { name: 'Pusad', nameMr: 'पुसद' },
    { name: 'Umarkhed', nameMr: 'उमरखेड' },
    { name: 'Wani', nameMr: 'वणी' },
    { name: 'Digras', nameMr: 'दिग्रस' },
    { name: 'Darwha', nameMr: 'दारव्हा' },
    { name: 'Arni', nameMr: 'आर्णी' },
    { name: 'Ghatanji', nameMr: 'घाटंजी' },
    { name: 'Ralegaon', nameMr: 'राळेगाव' },
    { name: 'Kelapur', nameMr: 'केळापूर' },
    { name: 'Ner', nameMr: 'नेर' },
    { name: 'Mahagaon', nameMr: 'महागाव' },
    { name: 'Babhulgaon', nameMr: 'बाभूळगाव' },
    { name: 'Kalamb', nameMr: 'कळंब' },
    { name: 'Maregaon', nameMr: 'मारेगाव' },
    { name: 'Zari-Jamani', nameMr: 'झरी जामणी' }
  ],
  'MH-WS': [
    { name: 'Washim', nameMr: 'वाशीम' },
    { name: 'Karanja', nameMr: 'कारंजा' },
    { name: 'Risod', nameMr: 'रिसोड' },
    { name: 'Mangrulpir', nameMr: 'मंगरुळपीर' },
    { name: 'Malegaon', nameMr: 'मालेगाव' },
    { name: 'Manora', nameMr: 'मनोरा' }
  ],

  // 6. Nagpur Division (6 Districts)
  'MH-NG': [
    { name: 'Nagpur Urban', nameMr: 'नागपूर शहर' },
    { name: 'Nagpur Rural', nameMr: 'नागपूर ग्रामीण' },
    { name: 'Kamptee', nameMr: 'कामठी' },
    { name: 'Katol', nameMr: 'काटोल' },
    { name: 'Savner', nameMr: 'सावनेर' },
    { name: 'Ramtek', nameMr: 'रामटेक' },
    { name: 'Hingna', nameMr: 'हिंगणा' },
    { name: 'Umred', nameMr: 'उमरेड' },
    { name: 'Narkhed', nameMr: 'नरखेड' },
    { name: 'Kalameshwar', nameMr: 'कलमेश्वर' },
    { name: 'Mouda', nameMr: 'मौदा' },
    { name: 'Parseoni', nameMr: 'पारशिवनी' },
    { name: 'Kuhi', nameMr: 'कुही' },
    { name: 'Bhivapur', nameMr: 'भिवापूर' }
  ],
  'MH-WR': [
    { name: 'Wardha', nameMr: 'वर्धा' },
    { name: 'Hinganghat', nameMr: 'हिंगणघाट' },
    { name: 'Arvi', nameMr: 'आर्वी' },
    { name: 'Deoli', nameMr: 'देवळी' },
    { name: 'Seloo', nameMr: 'सेलू' },
    { name: 'Samudrapur', nameMr: 'समुद्रपूर' },
    { name: 'Karanja', nameMr: 'कारंजा' },
    { name: 'Ashti', nameMr: 'आष्टी' }
  ],
  'MH-BH': [
    { name: 'Bhandara', nameMr: 'भंडारा' },
    { name: 'Tumsar', nameMr: 'तुमसर' },
    { name: 'Pauni', nameMr: 'पौनी' },
    { name: 'Sakoli', nameMr: 'साकोली' },
    { name: 'Mohadi', nameMr: 'मोहाडी' },
    { name: 'Lakhani', nameMr: 'लाखनी' },
    { name: 'Lakhandur', nameMr: 'लाखांदूर' }
  ],
  'MH-GD': [
    { name: 'Gondia', nameMr: 'गोंदिया' },
    { name: 'Tiroda', nameMr: 'तिरोडा' },
    { name: 'Amgaon', nameMr: 'आमगाव' },
    { name: 'Goregaon', nameMr: 'गोरेगाव' },
    { name: 'Arjuni Morgaon', nameMr: 'अर्जुनी मोरगाव' },
    { name: 'Deori', nameMr: 'देवरी' },
    { name: 'Sadak Arjuni', nameMr: 'सडक अर्जुनी' },
    { name: 'Salekasa', nameMr: 'सालेकसा' }
  ],
  'MH-CH': [
    { name: 'Chandrapur', nameMr: 'चंद्रपूर' },
    { name: 'Ballarpur', nameMr: 'बल्लारपूर' },
    { name: 'Bhadravati', nameMr: 'भद्रावती' },
    { name: 'Warora', nameMr: 'वरोरा' },
    { name: 'Bramhapuri', nameMr: 'ब्रह्मपुरी' },
    { name: 'Rajura', nameMr: 'राजूरा' },
    { name: 'Chimur', nameMr: 'चिमूर' },
    { name: 'Nagbhid', nameMr: 'नागभीड' },
    { name: 'Mul', nameMr: 'मूल' },
    { name: 'Sindewahi', nameMr: 'सिंदेवाही' },
    { name: 'Gondpipri', nameMr: 'गोंडपिपरी' },
    { name: 'Korpana', nameMr: 'कोरपना' },
    { name: 'Saoli', nameMr: 'सावली' },
    { name: 'Pombhurna', nameMr: 'पोंभुर्णा' },
    { name: 'Jivati', nameMr: 'जिवती' }
  ],
  'MH-GA': [
    { name: 'Gadchiroli', nameMr: 'गडचिरोली' },
    { name: 'Armori', nameMr: 'आरमोरी' },
    { name: 'Chamorshi', nameMr: 'चामोर्शी' },
    { name: 'Desaiganj', nameMr: 'देसाईगंज' },
    { name: 'Aheri', nameMr: 'अहेरी' },
    { name: 'Kurkheda', nameMr: 'कुरखेडा' },
    { name: 'Dhanora', nameMr: 'धानोरा' },
    { name: 'Etapalli', nameMr: 'एटापल्ली' },
    { name: 'Sironcha', nameMr: 'सिरोंचा' },
    { name: 'Mulchera', nameMr: 'मुलचेरा' },
    { name: 'Korchi', nameMr: 'कोरची' },
    { name: 'Bhamragad', nameMr: 'भामरागड' }
  ],
};

export const MAHARASHTRA_CITIES: CitySeed[] = [
  // Popular Urban Centers (Top priority / quick filter)
  { name: 'Pune', nameMr: 'पुणे', districtCode: 'MH-PU', talukaName: 'Pune City', isPopular: 1, sortOrder: 1 },
  { name: 'Mumbai', nameMr: 'मुंबई', districtCode: 'MH-MC', talukaName: 'Mumbai City', isPopular: 1, sortOrder: 2 },
  { name: 'Navi Mumbai', nameMr: 'नवी मुंबई', districtCode: 'MH-TH', talukaName: 'Thane', isPopular: 1, sortOrder: 3 },
  { name: 'Thane', nameMr: 'ठाणे', districtCode: 'MH-TH', talukaName: 'Thane', isPopular: 1, sortOrder: 4 },
  { name: 'Pimpri-Chinchwad', nameMr: 'पिंपरी-चिंचवड', districtCode: 'MH-PU', talukaName: 'Haveli', isPopular: 1, sortOrder: 5 },
  { name: 'Nagpur', nameMr: 'नागपूर', districtCode: 'MH-NG', talukaName: 'Nagpur Urban', isPopular: 1, sortOrder: 6 },
  { name: 'Nashik', nameMr: 'नाशिक', districtCode: 'MH-NS', talukaName: 'Nashik', isPopular: 1, sortOrder: 7 },
  { name: 'Chhatrapati Sambhajinagar', nameMr: 'छत्रपती संभाजीनगर', districtCode: 'MH-CS', talukaName: 'Chhatrapati Sambhajinagar', isPopular: 1, sortOrder: 8 },
  { name: 'Kolhapur', nameMr: 'कोल्हापूर', districtCode: 'MH-KO', talukaName: 'Karveer', isPopular: 1, sortOrder: 9 },
  { name: 'Solapur', nameMr: 'सोलापूर', districtCode: 'MH-SO', talukaName: 'Solapur North', isPopular: 1, sortOrder: 10 },
  { name: 'Sangli', nameMr: 'सांगली', districtCode: 'MH-SN', talukaName: 'Miraj', isPopular: 1, sortOrder: 11 },
  { name: 'Satara', nameMr: 'सातारा', districtCode: 'MH-ST', talukaName: 'Satara', isPopular: 1, sortOrder: 12 },
  { name: 'Amravati', nameMr: 'अमरावती', districtCode: 'MH-AM', talukaName: 'Amravati', isPopular: 1, sortOrder: 13 },
  { name: 'Akola', nameMr: 'अकोला', districtCode: 'MH-AK', talukaName: 'Akola', isPopular: 1, sortOrder: 14 },
  { name: 'Latur', nameMr: 'लातूर', districtCode: 'MH-LA', talukaName: 'Latur', isPopular: 1, sortOrder: 15 },
  { name: 'Nanded', nameMr: 'नांदेड', districtCode: 'MH-NA', talukaName: 'Nanded', isPopular: 1, sortOrder: 16 },
  { name: 'Ahilyanagar', nameMr: 'अहिल्यानगर', districtCode: 'MH-AH', talukaName: 'Nagar', isPopular: 1, sortOrder: 17 },
  { name: 'Ratnagiri', nameMr: 'रत्नागिरी', districtCode: 'MH-RT', talukaName: 'Ratnagiri', isPopular: 1, sortOrder: 18 },
  { name: 'Jalgaon', nameMr: 'जळगाव', districtCode: 'MH-JL', talukaName: 'Jalgaon', isPopular: 1, sortOrder: 19 },
  { name: 'Dhule', nameMr: 'धुळे', districtCode: 'MH-DH', talukaName: 'Dhule', isPopular: 1, sortOrder: 20 },
  { name: 'Chandrapur', nameMr: 'चंद्रपूर', districtCode: 'MH-CH', talukaName: 'Chandrapur', isPopular: 1, sortOrder: 21 },
  { name: 'Wardha', nameMr: 'वर्धा', districtCode: 'MH-WR', talukaName: 'Wardha', isPopular: 1, sortOrder: 22 },
  { name: 'Dharashiv', nameMr: 'धाराशिव', districtCode: 'MH-DR', talukaName: 'Dharashiv', isPopular: 1, sortOrder: 23 },
  { name: 'Jalna', nameMr: 'जालना', districtCode: 'MH-JN', talukaName: 'Jalna', isPopular: 1, sortOrder: 24 },
  { name: 'Beed', nameMr: 'बीड', districtCode: 'MH-BD', talukaName: 'Beed', isPopular: 1, sortOrder: 25 },
  { name: 'Parbhani', nameMr: 'परभणी', districtCode: 'MH-PR', talukaName: 'Parbhani', isPopular: 1, sortOrder: 26 },
  { name: 'Buldhana', nameMr: 'बुलढाणा', districtCode: 'MH-BU', talukaName: 'Buldhana', isPopular: 1, sortOrder: 27 },
  { name: 'Yavatmal', nameMr: 'यवतमाळ', districtCode: 'MH-YA', talukaName: 'Yavatmal', isPopular: 1, sortOrder: 28 },
  { name: 'Bhandara', nameMr: 'भंडारा', districtCode: 'MH-BH', talukaName: 'Bhandara', isPopular: 1, sortOrder: 29 },
  { name: 'Gondia', nameMr: 'गोंदिया', districtCode: 'MH-GD', talukaName: 'Gondia', isPopular: 1, sortOrder: 30 },
  { name: 'Gadchiroli', nameMr: 'गडचिरोली', districtCode: 'MH-GA', talukaName: 'Gadchiroli', isPopular: 1, sortOrder: 31 },
  { name: 'Nandurbar', nameMr: 'नंदुरबार', districtCode: 'MH-ND', talukaName: 'Nandurbar', isPopular: 1, sortOrder: 32 },
  { name: 'Washim', nameMr: 'वाशीम', districtCode: 'MH-WS', talukaName: 'Washim', isPopular: 1, sortOrder: 33 },
  { name: 'Hingoli', nameMr: 'हिंगोली', districtCode: 'MH-HG', talukaName: 'Hingoli', isPopular: 1, sortOrder: 34 },
  { name: 'Palghar', nameMr: 'पालघर', districtCode: 'MH-PL', talukaName: 'Palghar', isPopular: 1, sortOrder: 35 },
  { name: 'Alibag', nameMr: 'अलिबाग', districtCode: 'MH-RG', talukaName: 'Alibag', isPopular: 1, sortOrder: 36 },

  // Key Municipal / Cultural Hubs & Taluka Towns
  { name: 'Kalyan-Dombivli', nameMr: 'कल्याण-डोंबिवली', districtCode: 'MH-TH', talukaName: 'Kalyan', sortOrder: 40 },
  { name: 'Mira-Bhayandar', nameMr: 'मीरा-भाईंदर', districtCode: 'MH-TH', talukaName: 'Thane', sortOrder: 41 },
  { name: 'Vasai-Virar', nameMr: 'वसई-विरार', districtCode: 'MH-PL', talukaName: 'Vasai', sortOrder: 42 },
  { name: 'Panvel', nameMr: 'पनवेल', districtCode: 'MH-RG', talukaName: 'Panvel', sortOrder: 43 },
  { name: 'Ulhasnagar', nameMr: 'उल्हासनगर', districtCode: 'MH-TH', talukaName: 'Ulhasnagar', sortOrder: 44 },
  { name: 'Bhiwandi', nameMr: 'भिवंडी', districtCode: 'MH-TH', talukaName: 'Bhiwandi', sortOrder: 45 },
  { name: 'Baramati', nameMr: 'बारामती', districtCode: 'MH-PU', talukaName: 'Baramati', sortOrder: 46 },
  { name: 'Chiplun', nameMr: 'चिपळूण', districtCode: 'MH-RT', talukaName: 'Chiplun', sortOrder: 47 },
  { name: 'Sawantwadi', nameMr: 'सावंतवाडी', districtCode: 'MH-SD', talukaName: 'Sawantwadi', sortOrder: 48 },
  { name: 'Kankavli', nameMr: 'कणकवली', districtCode: 'MH-SD', talukaName: 'Kankavli', sortOrder: 49 },
  { name: 'Karad', nameMr: 'कराड', districtCode: 'MH-ST', talukaName: 'Karad', sortOrder: 50 },
  { name: 'Wai', nameMr: 'वाई', districtCode: 'MH-ST', talukaName: 'Wai', sortOrder: 51 },
  { name: 'Mahabaleshwar', nameMr: 'महाबळेश्वर', districtCode: 'MH-ST', talukaName: 'Mahabaleshwar', sortOrder: 52 },
  { name: 'Pandharpur', nameMr: 'पंढरपूर', districtCode: 'MH-SO', talukaName: 'Pandharpur', sortOrder: 53 },
  { name: 'Barshi', nameMr: 'बार्शी', districtCode: 'MH-SO', talukaName: 'Barshi', sortOrder: 54 },
  { name: 'Ichalkaranji', nameMr: 'इचलकरंजी', districtCode: 'MH-KO', talukaName: 'Hatkanangale', sortOrder: 55 },
  { name: 'Malegaon', nameMr: 'मालेगाव', districtCode: 'MH-NS', talukaName: 'Malegaon', sortOrder: 56 },
  { name: 'Sinnar', nameMr: 'सिन्नर', districtCode: 'MH-NS', talukaName: 'Sinnar', sortOrder: 57 },
  { name: 'Shrirampur', nameMr: 'श्रीरामपूर', districtCode: 'MH-AH', talukaName: 'Shrirampur', sortOrder: 58 },
  { name: 'Sangamner', nameMr: 'संगमनेर', districtCode: 'MH-AH', talukaName: 'Sangamner', sortOrder: 59 },
  { name: 'Bhusawal', nameMr: 'भुसावळ', districtCode: 'MH-JL', talukaName: 'Bhusawal', sortOrder: 60 },
  { name: 'Udgir', nameMr: 'उदगीर', districtCode: 'MH-LA', talukaName: 'Udgir', sortOrder: 61 },
  { name: 'Khamgaon', nameMr: 'खामगाव', districtCode: 'MH-BU', talukaName: 'Khamgaon', sortOrder: 62 },
  { name: 'Shegaon', nameMr: 'शेगाव', districtCode: 'MH-BU', talukaName: 'Shegaon', sortOrder: 63 },
  { name: 'Achalpur', nameMr: 'अचलपूर', districtCode: 'MH-AM', talukaName: 'Achalpur', sortOrder: 64 },
  { name: 'Kamptee', nameMr: 'कामठी', districtCode: 'MH-NG', talukaName: 'Kamptee', sortOrder: 65 },
  { name: 'Hinganghat', nameMr: 'हिंगणघाट', districtCode: 'MH-WR', talukaName: 'Hinganghat', sortOrder: 66 },
  { name: 'Ballarpur', nameMr: 'बल्लारपूर', districtCode: 'MH-CH', talukaName: 'Ballarpur', sortOrder: 67 }
];

export async function importMaharashtraAdministrativeData(dryRun = false) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log(`\n==============================================================================`);
  console.log(`MAHATICKET: MAHARASHTRA ADMINISTRATIVE DATASET IMPORT (${dryRun ? 'PREVIEW MODE' : 'COMMIT MODE'})`);
  console.log(`Source: Govt of Maharashtra / DES / Local Government Directory (LGD)`);
  console.log(`==============================================================================\n`);

  try {
    // 1. Verify Districts
    const districtRes = await client.query('SELECT id, code, name, name_mr FROM districts ORDER BY id');
    console.log(`[1] Total Districts in Master: ${districtRes.rows.length} of 36`);

    const districtMap = new Map<string, number>();
    districtRes.rows.forEach(d => districtMap.set(d.code, d.id));

    // 2. Ensure Unique constraint on talukas(district_id, name)
    if (!dryRun) {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_talukas_district_name ON talukas (district_id, name);
      `);
    }

    // 3. Process Talukas
    let totalTalukaCount = 0;
    const talukaRows: { distId: number; name: string; nameMr: string }[] = [];

    for (const [distCode, tList] of Object.entries(MAHARASHTRA_TALUKAS)) {
      const distId = districtMap.get(distCode);
      if (!distId) {
        console.warn(`Warning: District code ${distCode} not found in DB!`);
        continue;
      }

      for (const t of tList) {
        totalTalukaCount++;
        talukaRows.push({ distId, name: t.name, nameMr: t.nameMr });
      }
    }

    console.log(`[2] Talukas in Dataset: ${totalTalukaCount} across 36 districts.`);

    const talukaIdMap = new Map<string, number>(); // key: `${districtId}:${name}`

    if (!dryRun && talukaRows.length > 0) {
      // Chunk into batches of 100 for fast atomic execution
      const chunkSize = 100;
      for (let i = 0; i < talukaRows.length; i += chunkSize) {
        const chunk = talukaRows.slice(i, i + chunkSize);
        const valueStrings: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        for (const row of chunk) {
          valueStrings.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, 1)`);
          params.push(row.distId, row.name, row.nameMr);
        }

        const query = `
          INSERT INTO talukas (district_id, name, name_mr, is_active)
          VALUES ${valueStrings.join(', ')}
          ON CONFLICT (district_id, name) 
          DO UPDATE SET name_mr = EXCLUDED.name_mr, is_active = 1
          RETURNING id, district_id, name;
        `;
        const res = await client.query(query, params);
        res.rows.forEach(r => talukaIdMap.set(`${r.district_id}:${r.name}`, r.id));
      }
      console.log(`    Successfully upserted all talukas into master.`);
    }

    // 4. Retrieve full taluka map
    if (!dryRun) {
      const allTalukas = await client.query('SELECT id, district_id, name FROM talukas');
      allTalukas.rows.forEach(t => {
        talukaIdMap.set(`${t.district_id}:${t.name}`, t.id);
      });
    }

    // 5. Process Cities & Towns
    console.log(`[3] Processing Cities & Towns Catalog (${MAHARASHTRA_CITIES.length} records)...`);
    if (!dryRun && MAHARASHTRA_CITIES.length > 0) {
      const valueStrings: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      for (const city of MAHARASHTRA_CITIES) {
        const distId = districtMap.get(city.districtCode) || null;
        const talukaId = distId && city.talukaName ? talukaIdMap.get(`${distId}:${city.talukaName}`) || null : null;

        valueStrings.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 1, $${pIdx++})`);
        params.push(
          city.name,
          city.nameMr,
          distId,
          talukaId,
          city.isPopular || 0,
          city.sortOrder || 99
        );
      }

      const cityQuery = `
        INSERT INTO cities (name, name_mr, district_id, taluka_id, is_popular, is_active, sort_order)
        VALUES ${valueStrings.join(', ')}
        ON CONFLICT (name) 
        DO UPDATE SET 
          name_mr = EXCLUDED.name_mr,
          district_id = COALESCE(EXCLUDED.district_id, cities.district_id),
          taluka_id = COALESCE(EXCLUDED.taluka_id, cities.taluka_id),
          is_popular = EXCLUDED.is_popular,
          is_active = 1,
          sort_order = EXCLUDED.sort_order;
      `;
      await client.query(cityQuery, params);
      console.log(`    Successfully upserted all cities/towns into catalog.`);
    }

    // 6. Fix any dangling venues
    if (!dryRun) {
      // Link venues to district_id and city_id where missing
      await client.query(`
        UPDATE venues v
        SET district_id = c.district_id, city_id = c.id
        FROM cities c
        WHERE LOWER(TRIM(v.city)) = LOWER(TRIM(c.name))
          AND (v.district_id IS NULL OR v.city_id IS NULL);
      `);

      // Aliases: Ahmednagar → Ahilyanagar, Vasai → Vasai-Virar
      await client.query(`
        UPDATE venues v
        SET city_id = c.id, district_id = COALESCE(v.district_id, c.district_id)
        FROM cities c
        WHERE v.city_id IS NULL
          AND LOWER(TRIM(v.city)) IN ('ahmednagar', 'ahmadnagar')
          AND LOWER(TRIM(c.name)) = 'ahilyanagar'
      `);
      await client.query(`
        UPDATE venues v
        SET city_id = c.id, district_id = COALESCE(v.district_id, c.district_id)
        FROM cities c
        WHERE v.city_id IS NULL
          AND LOWER(TRIM(v.city)) IN ('vasai', 'vasai-virar', 'vasai virar')
          AND LOWER(TRIM(c.name)) = 'vasai-virar'
      `);
    }

    // 7. Audit Summary
    const finalDistCount = await client.query('SELECT count(*) FROM districts');
    const finalTalukaCount = await client.query('SELECT count(*) FROM talukas');
    const finalCityCount = await client.query('SELECT count(*) FROM cities');
    const finalVenueCount = await client.query('SELECT count(*) FROM venues');

    console.log(`\n==============================================================================`);
    console.log(`SUMMARY RESULT:`);
    console.log(`- Districts: ${finalDistCount.rows[0].count} / 36`);
    console.log(`- Talukas:   ${finalTalukaCount.rows[0].count} / 358`);
    console.log(`- Cities:    ${finalCityCount.rows[0].count} total directory entries`);
    console.log(`- Venues:    ${finalVenueCount.rows[0].count} venues active`);
    console.log(`==============================================================================\n`);

  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  const isPreview = process.argv.includes('--preview');
  importMaharashtraAdministrativeData(isPreview).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
