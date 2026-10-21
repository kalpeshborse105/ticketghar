-- ==============================================================================
-- MahaTicket (महाटिकिट) - Real Movies (BookMyShow) & Dramas (TicketKhidkee)
-- Production Seed Script with Guaranteed Future Dates & Full Seat Inventory
-- Run this in Supabase SQL Editor or psql to populate authentic fresh shows.
-- ==============================================================================

BEGIN;

-- 1. Ensure Default Organizer
INSERT INTO organizers (id, name, company_name, email, phone, city, verification_status, status)
VALUES (1, 'MahaNatya Pratishthan', 'Maharashtra Theatrical & Cinema Corp', 'support@mahaticket.in', '9822001122', 'Pune', 'verified', 'active')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  company_name = EXCLUDED.company_name,
  status = 'active';

-- 2. Venues (Cinemas & Iconic Natyagruhas)
INSERT INTO venues (id, name, name_mr, address, city, state, pincode, total_capacity, has_seat_layout, layout_config)
VALUES 
  (
    1,
    'Bal Gandharva Rang Mandir',
    'बाळ गंधर्व रंगमंदिर',
    'J.M. Road, Shivajinagar, Pune',
    'Pune',
    'Maharashtra',
    '411005',
    850,
    1,
    '{"screenArc":true,"stageLabel":"STAGE / रंगमंच"}'
  ),
  (
    2,
    'Dinanath Mangeshkar Natyagruha',
    'दीनानाथ मंगेशकर नाट्यगृह',
    'Mongibai Road, Vile Parle East, Mumbai',
    'Mumbai',
    'Maharashtra',
    '400057',
    900,
    1,
    '{"screenArc":true,"stageLabel":"STAGE / रंगमंच"}'
  ),
  (
    3,
    'Yashwantrao Chavan Natyagruha',
    'यशवंतराव चव्हाण नाट्यगृह',
    'Near Karve Statue, Kothrud, Pune',
    'Pune',
    'Maharashtra',
    '411038',
    800,
    1,
    '{"screenArc":true,"stageLabel":"STAGE / रंगमंच"}'
  ),
  (
    4,
    'Dr. Kashinath Ghanekar Natyagruha',
    'डॉ. काशिनाथ घाणेकर नाट्यगृह',
    'Ghodbunder Road, Hiranandani Meadows, Thane West',
    'Thane',
    'Maharashtra',
    '400610',
    950,
    1,
    '{"screenArc":true,"stageLabel":"STAGE / रंगमंच"}'
  ),
  (
    5,
    'PVR INOX: The Pavillion Mall',
    'पीव्हीआर आयनॉक्स: द पॅव्हेलियन मॉल',
    'Senapati Bapat Road, Shivajinagar, Pune',
    'Pune',
    'Maharashtra',
    '411016',
    350,
    1,
    '{"screenArc":true,"stageLabel":"CINEMA SCREEN / पडदा"}'
  ),
  (
    6,
    'Cinepolis: Westend Mall',
    'सिनेपोलिस: वेस्टएंड मॉल',
    'Parihar Chowk, Aundh, Pune',
    'Pune',
    'Maharashtra',
    '411007',
    400,
    1,
    '{"screenArc":true,"stageLabel":"CINEMA SCREEN / पडदा"}'
  ),
  (
    7,
    'PVR INOX: R City Mall',
    'पीव्हीआर आयनॉक्स: आर सिटी मॉल',
    'LBS Marg, Ghatkopar West, Mumbai',
    'Mumbai',
    'Maharashtra',
    '400086',
    420,
    1,
    '{"screenArc":true,"stageLabel":"CINEMA SCREEN / पडदा"}'
  )
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  name_mr = EXCLUDED.name_mr,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  layout_config = EXCLUDED.layout_config;

-- Reset sequence for venues
SELECT setval('venues_id_seq', (SELECT MAX(id) FROM venues));

-- 3. Venue Sections (Tiers: Balcony / First Class / Stall or Recliner / Prime / Classic)
INSERT INTO venue_sections (id, venue_id, name, name_mr, rows_count, cols_count, base_price)
VALUES 
  -- Venue 1: Bal Gandharva
  (1, 1, 'Balcony', 'बाल्कनी', 2, 8, 75000),
  (2, 1, 'First Class', 'प्रथम वर्ग', 2, 8, 50000),
  (3, 1, 'Stall', 'स्टॉल', 2, 8, 35000),

  -- Venue 2: Dinanath Mangeshkar Natyagruha
  (4, 2, 'Balcony', 'बाल्कनी', 2, 8, 70000),
  (5, 2, 'Executive', 'एक्झिक्युटिव्ह', 2, 8, 50000),
  (6, 2, 'Stall', 'स्टॉल', 2, 8, 30000),

  -- Venue 3: Yashwantrao Chavan Natyagruha
  (7, 3, 'Balcony', 'बाल्कनी', 2, 8, 60000),
  (8, 3, 'First Class', 'प्रथम वर्ग', 2, 8, 45000),
  (9, 3, 'Stall', 'स्टॉल', 2, 8, 30000),

  -- Venue 4: Dr. Kashinath Ghanekar
  (10, 4, 'Balcony', 'बाल्कनी', 2, 8, 75000),
  (11, 4, 'Gold Class', 'गोल्ड क्लास', 2, 8, 55000),
  (12, 4, 'Stall', 'स्टॉल', 2, 8, 35000),

  -- Venue 5: PVR INOX Pavillion Pune (Cinema)
  (13, 5, 'VIP Recliner', 'व्हीआयपी रिक्लायनर', 1, 8, 45000),
  (14, 5, 'Prime', 'प्राइम क्लास', 2, 8, 28000),
  (15, 5, 'Classic', 'क्लासिक', 2, 8, 20000),

  -- Venue 6: Cinepolis Westend Pune (Cinema)
  (16, 6, 'VIP Recliner', 'व्हीआयपी रिक्लायनर', 1, 8, 40000),
  (17, 6, 'Prime', 'प्राइम क्लास', 2, 8, 25000),
  (18, 6, 'Classic', 'क्लासिक', 2, 8, 18000),

  -- Venue 7: PVR INOX R City Mumbai (Cinema)
  (19, 7, 'VIP Recliner', 'व्हीआयपी रिक्लायनर', 1, 8, 55000),
  (20, 7, 'Prime', 'प्राइम क्लास', 2, 8, 32000),
  (21, 7, 'Classic', 'क्लासिक', 2, 8, 24000)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  name_mr = EXCLUDED.name_mr,
  base_price = EXCLUDED.base_price;

SELECT setval('venue_sections_id_seq', (SELECT MAX(id) FROM venue_sections));

-- 4. Physical Seats for All Venues
-- Insert seats systematically across rows A-F for each section
INSERT INTO seats (venue_id, section_id, row_label, seat_number, seat_code, tier, is_accessible, is_blocked)
SELECT 
  sec.venue_id,
  sec.id AS section_id,
  r.row_label,
  c.col_num AS seat_number,
  r.row_label || LPAD(c.col_num::text, 2, '0') AS seat_code,
  CASE 
    WHEN sec.base_price >= 55000 THEN 'platinum'
    WHEN sec.base_price >= 35000 THEN 'gold'
    ELSE 'silver'
  END AS tier,
  CASE WHEN c.col_num = 1 THEN 1 ELSE 0 END AS is_accessible,
  0 AS is_blocked
FROM venue_sections sec
CROSS JOIN (
  VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')
) AS r(row_label)
CROSS JOIN (
  VALUES (1), (2), (3), (4), (5), (6), (7), (8)
) AS c(col_num)
ON CONFLICT (venue_id, seat_code) DO NOTHING;

SELECT setval('seats_id_seq', (SELECT COALESCE(MAX(id), 1) FROM seats));

-- 5. Real Events: BookMyShow (Movies) & TicketKhidkee (Plays / Dramas)
INSERT INTO events (
  organizer_id, venue_id, title, title_mr, slug, category, category_mr, language, 
  age_guidance, duration_minutes, description, description_mr, poster_url, banner_url, 
  trailer_url, status, featured, tag, cast_crew
)
VALUES 
  -- [MOVIE 1] Pushpa 2: The Rule
  (
    1, 5,
    'Pushpa 2: The Rule',
    'पुष्पा २: द रुल (महा-चित्रपट)',
    'pushpa-2-the-rule',
    'movies',
    'चित्रपट',
    'Hindi / Marathi / Telugu',
    'UA',
    200,
    'Pushpa Raj returns in the ultimate face-off against Bhanwar Singh Shekhawat! Sukumar directs Allu Arjun in India''s most anticipated action masterpiece featuring explosive stunts and sensational music.',
    'पुष्पा राज आणि भंवर सिंह शेखावत यांच्यातील रोमांचक संघर्ष! अल्लू अर्जुन यांचा धमाकेदार अंदाज, देवी श्री प्रसाद यांचे सुपरफास्ट संगीत आणि भव्य सिनेमॅटिक अनुभव.',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80',
    'https://www.youtube.com/watch?v=1kVK0MZlbI4',
    'published',
    1,
    'ब्लॉकबस्टर चित्रपट',
    '[{"name":"अल्लू अर्जुन (Allu Arjun)","role":"पुष्पा राज"},{"name":"रश्मिका मंदाना (Rashmika Mandanna)","role":"श्रीवल्ली"},{"name":"फहाद फासिल (Fahadh Faasil)","role":"भंवर सिंह शेखावत"},{"name":"सुकुमार (Sukumar)","role":"दिग्दर्शक"}]'
  ),

  -- [MOVIE 2] Juna Furniture
  (
    1, 6,
    'Juna Furniture',
    'जुना फर्निचर (सुपरहिट कौटुंबिक कथा)',
    'juna-furniture',
    'movies',
    'चित्रपट',
    'Marathi',
    'U',
    140,
    'Mahesh Manjrekar''s deeply moving courtroom family drama questioning society''s treatment of senior citizens. A landmark film celebrating generational self-respect and emotional bonds.',
    'महेश मांजरेकर दिग्दर्शित हृदयस्पर्शी मराठी चित्रपट! वृद्ध आई-वडिलांच्या स्वाभिमानाची आणि आधुनिक पिढीच्या कर्तव्याची जाणीव करून देणारी संवेदनशील गोष्ट.',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1000&q=80',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&q=80',
    'https://www.youtube.com/watch?v=0wCC348dUCY',
    'published',
    1,
    'हार्ट-टचिंग फॅमिली ड्रामा',
    '[{"name":"महेश मांजरेकर","role":"गोविंद पाठक"},{"name":"मेधा मांजरेकर","role":"सुहासिनी पाठक"},{"name":"भूषण प्रधान","role":"अनिकेत पाठक"},{"name":"उपेंद्र लिमये","role":"अ‍ॅड. सुरेखा"}]'
  ),

  -- [MOVIE 3] Kantara: Chapter 1
  (
    1, 7,
    'Kantara: Chapter 1',
    'कांतारा: चॅप्टर १ (दैवी लोकगाथा)',
    'kantara-chapter-1',
    'movies',
    'चित्रपट',
    'Hindi / Kannada / Marathi',
    'UA',
    165,
    'The divine origin story of Kadambas and the sacred forest protector deity. Rishab Shetty delivers a spellbinding mythological visual experience celebrating Indian indigenous culture.',
    'दैवी शक्ती आणि जंगलातील पारंपरिक रक्षकाची भव्य पौराणिक पार्श्वभूमी! ऋषभ शेट्टी यांचा थरारक अभिनय आणि अंगावर शहारे आणणारे पार्श्वसंगीत.',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&q=80',
    'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1600&q=80',
    '',
    'published',
    1,
    'महाकाव्य',
    '[{"name":"ऋषभ शेट्टी (Rishab Shetty)","role":"मुख्य अभिनेता व दिग्दर्शक"},{"name":"सप्तमी गौडा","role":"लीला"},{"name":"बी. अजनीश लोकनाथ","role":"संगीतकार"}]'
  ),

  -- [MOVIE 4] Baipan Bhaari Deva 2
  (
    1, 5,
    'Baipan Bhaari Deva 2',
    'बाईपण भारी देवा २',
    'baipan-bhaari-deva-2',
    'movies',
    'चित्रपट',
    'Marathi',
    'U',
    155,
    'The sensational 6 sisters are back with more laughter, sisterhood, tears, and celebration! Kedar Shinde brings the most joyful sequel of Maharashtra''s cinema history.',
    'सहा बहिणींची तीच गोड आणि खट्याळ जोडी पुन्हा एकदा मोठ्या पडद्यावर! कौटुंबिक सण, मंगळागौर आणि प्रत्येक स्त्रीच्या मनातील स्वाभिमानाची नवी गोष्ट.',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1000&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&q=80',
    '',
    'published',
    1,
    'स्त्रीशक्तीचा महा-उत्सव',
    '[{"name":"रोहिणी हट्टंगडी","role":"जया"},{"name":"वंदना गुप्ते","role":"शशी"},{"name":"सुकन्या कुलकर्णी","role":"साधना"},{"name":"सुचित्रा बांदेकर","role":"पल्लवी"},{"name":"केदार शिंदे","role":"दिग्दर्शक"}]'
  ),

  -- [MOVIE 5] Avatar: Fire and Ash
  (
    1, 7,
    'Avatar: Fire and Ash (IMAX 3D)',
    'अवतार: फायर अँड ॲश (आयमॅक्स ३डी)',
    'avatar-fire-and-ash',
    'movies',
    'चित्रपट',
    'English / Hindi',
    'UA',
    195,
    'James Cameron takes us back to Pandora to meet the Ash People (fire clan). Groundbreaking visual effects, breathtaking ocean landscapes, and epic sci-fi storytelling.',
    'पँडोरा विश्वाचा सर्वात नेत्रदीपक अध्याय! जेम्स कॅमेरून यांची अद्भूत कल्पकता आणि थ्रीडी पडद्यावरील अविस्मरणीय अनुभव.',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80',
    '',
    'published',
    0,
    'आयमॅक्स ३डी महानाट्य',
    '[{"name":"सॅम वॉर्थिंग्टन","role":"जेक सुली"},{"name":"झोई साल्डाना","role":"नेतिरी"},{"name":"सिगोर्नी वीव्हर","role":"किरी"},{"name":"जेम्स कॅमेरून","role":"दिग्दर्शक"}]'
  ),

  -- [DRAMA 1] Punha Sahi Re Sahi (TicketKhidkee Legend)
  (
    1, 1,
    'Punha Sahi Re Sahi',
    'पुन्हा सही रे सही',
    'punha-sahi-re-sahi',
    'plays',
    'नाटक',
    'Marathi',
    'U',
    165,
    'Bharat Jadhav''s record-shattering legendary comedy drama featuring 4 distinct avatars on stage! A laugh riot that has captivated millions of theatre lovers worldwide.',
    'भरत जाधव यांचे विक्रमी व तुफान गाजलेले मराठी नाटक! एकाच कलाकाराचे रंगमंचावर ४ भन्नाट अवतार आणि पोट धरून हसविणारी संवादफेक. संपूर्ण कुटुंबासह आवर्जून पाहण्यासारखे महानाट्य.',
    'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1000&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80',
    '',
    'published',
    1,
    'सुपरहिट हाऊसफुल्ल',
    '[{"name":"भरत जाधव","role":"मदन सुखात्मे / गलगले / हरिभाऊ"},{"name":"स्वाती चितणीस","role":"सह-कलाकार"},{"name":"केदार शिंदे","role":"दिग्दर्शक"}]'
  ),

  -- [DRAMA 2] Jar Tar Chi Goshta (TicketKhidkee Hit)
  (
    1, 3,
    'Jar Tar Chi Goshta',
    'जर तर ची गोष्ट',
    'jar-tar-chi-goshta',
    'plays',
    'नाटक',
    'Marathi',
    'U',
    145,
    'Umesh Kamat & Priya Bapat in a sensational modern relationship drama. A witty, emotionally mature masterpiece analyzing compromises, expectations, and unconditional love.',
    'उमेश कामत व प्रिया बापट यांची अद्भूत केमिस्ट्री! आधुनिक काळातील पती-पत्नीच्या नात्यातील अपेक्षा, मतभेद आणि प्रेमाचा हळवा गुंता मांडणारे आजच्या पिढीचे नाटक.',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1000&q=80',
    'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=1600&q=80',
    '',
    'published',
    1,
    'आजच्या पिढीचे नाटक',
    '[{"name":"उमेश कामत","role":"समीर"},{"name":"प्रिया बापट","role":"राधा"},{"name":"पल्लवी अजय","role":"सह-कलाकार"},{"name":"अद्वैत दादरकर","role":"दिग्दर्शक"}]'
  ),

  -- [DRAMA 3] Albattya Galbattya
  (
    1, 4,
    'Albattya Galbattya',
    'अलबत्या गलबत्या (बालनाट्य)',
    'albattya-galbattya',
    'plays',
    'नाटक',
    'Marathi',
    'U',
    150,
    'Vaibhav Mangle''s immortal portrayal of the cunning witch ''Chichundri''! Maharashtra''s most beloved children & family fairy-tale fantasy play filled with magical songs.',
    'वैभव मांगले यांची गाजलेली चेटकीण! लहान मुलांसाठी आणि मोठ्यांसाठी एक जादुई परीकथा. सुंदर गाणी, रंगीबेरंगी वेषभूषा आणि भन्नाट विनोद.',
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1000&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=80',
    '',
    'published',
    1,
    'लहान मुलांचे लाडके महानाट्य',
    '[{"name":"वैभव मांगले","role":"चेटकीण (चिचुंद्री)"},{"name":"मयुरेश पेम","role":"अलबत्या"},{"name":"चिन्मय मांडलेकर","role":"दिग्दर्शक"}]'
  ),

  -- [DRAMA 4] Natsamrat
  (
    1, 2,
    'Natsamrat',
    'नटसम्राट',
    'natsamrat',
    'plays',
    'नाटक',
    'Marathi',
    'U',
    175,
    'Kusumagraj''s timeless classic depicting the tragic journey of Shakespearean veteran actor Ganpatrao Belvalkar. Experience towering theatrical performances and iconic monologues.',
    'कुसुमाग्रज लिखित अजरामर मराठी अभिजात नाट्यकृती! अप्पासाहेब बेलवलकर यांची हृदयद्रावक कथा आणि रंगमंचावर थरार निर्माण करणारे गाजलेले स्वगत.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1000&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=80',
    '',
    'published',
    1,
    'अभिजात महानाट्य',
    '[{"name":"मोहन जोशी","role":"अप्पासाहेब बेलवलकर"},{"name":"रोहिणी हट्टंगडी","role":"कावेरी (सरकार)"},{"name":"जयंत सावरकर","role":"राम जोशी"}]'
  ),

  -- [DRAMA 5] Ghashiram Kotwal
  (
    1, 1,
    'Ghashiram Kotwal',
    'घाशीराम कोतवाल (संगीत नाटक)',
    'ghashiram-kotwal',
    'plays',
    'नाटक',
    'Marathi',
    'UA',
    160,
    'Vijay Tendulkar''s internationally acclaimed musical political drama. Highlighting the abuse of power with traditional lavani, kirtan, and folk theatre choreography.',
    'विजय तेंडुलकर लिखित जागतिक कीर्तीचे संगीत नाटक! सत्ता, राजकारण आणि सामाजिक व्यवस्थेवर कडक प्रहार करणारे पारंपरिक कीर्तन व लावणीयुक्त महानाट्य.',
    'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=1000&q=80',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600&q=80',
    '',
    'published',
    0,
    'जागतिक दर्जाचे नाटक',
    '[{"name":"ओमकार गोवर्धन","role":"घाशीराम"},{"name":"अनिकेत विश्वासराव","role":"नाना फडणवीस"},{"name":"भास्कर चंदावरकर","role":"मूळ संगीत"}]'
  ),

  -- [CULTURAL 6] Vasantotsav 2026 Live
  (
    1, 1,
    'Vasantotsav 2026 Live',
    'वसंतोत्सव २०२६ (भव्य शास्त्रीय संगीतोत्सव)',
    'vasantotsav-2026',
    'music',
    'संगीत महोत्सव',
    'Marathi / Hindi / Classical',
    'U',
    210,
    'Rahul Deshpande presents the grand musical tribute to Dr. Vasantrao Deshpande. Featuring India''s finest classical vocalists, fusion instrumentalists, and sufi maestros under the open stars.',
    'पं. वसंतराव देशपांडे यांच्या स्मृतीप्रित्यर्थ राहुल देशपांडे आयोजित महाराष्ट्राचा अग्रगण्य शास्त्रीय संगीत महोत्सव! नामवंत गायक, वादक आणि सूफी संगीताची अविस्मरणीय पर्वणी.',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&q=80',
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1600&q=80',
    '',
    'published',
    1,
    'भव्य संगीतोत्सव',
    '[{"name":"राहुल देशपांडे","role":"शास्त्रीय गायक व संयोजक"},{"name":"आनंद भाटे","role":"गायक"},{"name":"कौशिकी चक्रवर्ती","role":"गायिका"},{"name":"उस्ताद झाकीर हुसेन","role":"विशेष तबला वादन"}]'
  )
ON CONFLICT (slug) DO UPDATE SET 
  title = EXCLUDED.title,
  title_mr = EXCLUDED.title_mr,
  slug = EXCLUDED.slug,
  category = EXCLUDED.category,
  category_mr = EXCLUDED.category_mr,
  venue_id = EXCLUDED.venue_id,
  language = EXCLUDED.language,
  duration_minutes = EXCLUDED.duration_minutes,
  description = EXCLUDED.description,
  description_mr = EXCLUDED.description_mr,
  poster_url = EXCLUDED.poster_url,
  banner_url = EXCLUDED.banner_url,
  trailer_url = EXCLUDED.trailer_url,
  status = 'published',
  featured = EXCLUDED.featured,
  tag = EXCLUDED.tag,
  cast_crew = EXCLUDED.cast_crew;

SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));

-- 6. Dynamic Guaranteed Future Sessions for All Events
-- Advance any past sessions to future dates so existing booked tickets remain valid
UPDATE event_sessions 
SET 
  session_start_time = (CURRENT_DATE + INTERVAL '1 day' + '18:30:00'::time),
  session_end_time = (CURRENT_DATE + INTERVAL '1 day' + '21:30:00'::time),
  status = 'active'
WHERE session_start_time < NOW()
  AND event_id IN (
    SELECT id FROM events WHERE slug IN (
      'pushpa-2-the-rule', 'juna-furniture', 'kantara-chapter-1', 
      'baipan-bhaari-deva-2', 'avatar-fire-and-ash', 'punha-sahi-re-sahi', 
      'jar-tar-chi-goshta', 'albattya-galbattya', 'natsamrat', 
      'ghashiram-kotwal', 'vasantotsav-2026'
    )
  );

-- Insert upcoming sessions for each event (Tomorrow, Day+2, Day+3, Day+5) if not already present
INSERT INTO event_sessions (event_id, session_start_time, session_end_time, status)
SELECT 
  e.id AS event_id,
  (CURRENT_DATE + (s.day_offset || ' days')::interval + s.show_time::time) AS session_start_time,
  (CURRENT_DATE + (s.day_offset || ' days')::interval + s.show_time::time + '3 hours'::interval) AS session_end_time,
  'active' AS status
FROM events e
CROSS JOIN (
  VALUES 
    (1, '18:30:00'),
    (2, '15:00:00'),
    (3, '20:00:00'),
    (5, '11:00:00')
) AS s(day_offset, show_time)
WHERE e.slug IN (
  'pushpa-2-the-rule', 'juna-furniture', 'kantara-chapter-1', 
  'baipan-bhaari-deva-2', 'avatar-fire-and-ash', 'punha-sahi-re-sahi', 
  'jar-tar-chi-goshta', 'albattya-galbattya', 'natsamrat', 
  'ghashiram-kotwal', 'vasantotsav-2026'
)
AND NOT EXISTS (
  SELECT 1 FROM event_sessions es 
  WHERE es.event_id = e.id 
    AND es.session_start_time::date = (CURRENT_DATE + (s.day_offset || ' days')::interval)::date
    AND EXTRACT(HOUR FROM es.session_start_time) = EXTRACT(HOUR FROM s.show_time::time)
);

-- 7. Ticket Types linked to Venue Sections for Each Session
INSERT INTO ticket_types (event_id, session_id, section_id, name, name_mr, price, total_quota, available_quota, is_seated)
SELECT DISTINCT ON (es.id, sec.id)
  es.event_id,
  es.id AS session_id,
  sec.id AS section_id,
  sec.name,
  sec.name_mr,
  sec.base_price AS price,
  (sec.rows_count * sec.cols_count) AS total_quota,
  (sec.rows_count * sec.cols_count) AS available_quota,
  1 AS is_seated
FROM event_sessions es
JOIN events e ON es.event_id = e.id
JOIN venue_sections sec ON sec.venue_id = e.venue_id
WHERE e.slug IN (
  'pushpa-2-the-rule', 'juna-furniture', 'kantara-chapter-1', 
  'baipan-bhaari-deva-2', 'avatar-fire-and-ash', 'punha-sahi-re-sahi', 
  'jar-tar-chi-goshta', 'albattya-galbattya', 'natsamrat', 
  'ghashiram-kotwal', 'vasantotsav-2026'
)
AND NOT EXISTS (
  SELECT 1 FROM ticket_types tt 
  WHERE tt.session_id = es.id AND tt.section_id = sec.id
)
ORDER BY es.id, sec.id;

-- 8. Seat Inventory for Every Session
-- Provisions all seats for the session; marks ~20% as booked for realistic BookMyShow look
INSERT INTO seat_inventory (session_id, seat_id, ticket_type_id, status)
SELECT DISTINCT ON (es.id, st.id)
  es.id AS session_id,
  st.id AS seat_id,
  tt.id AS ticket_type_id,
  CASE 
    WHEN (st.seat_number = 3 OR st.seat_number = 7) AND (st.row_label = 'B' OR st.row_label = 'D') THEN 'booked'
    ELSE 'available'
  END AS status
FROM event_sessions es
JOIN events e ON es.event_id = e.id
JOIN seats st ON st.venue_id = e.venue_id
JOIN ticket_types tt ON tt.session_id = es.id AND tt.section_id = st.section_id
WHERE e.slug IN (
  'pushpa-2-the-rule', 'juna-furniture', 'kantara-chapter-1', 
  'baipan-bhaari-deva-2', 'avatar-fire-and-ash', 'punha-sahi-re-sahi', 
  'jar-tar-chi-goshta', 'albattya-galbattya', 'natsamrat', 
  'ghashiram-kotwal', 'vasantotsav-2026'
)
ORDER BY es.id, st.id, tt.id ASC
ON CONFLICT (session_id, seat_id) DO UPDATE SET 
  ticket_type_id = EXCLUDED.ticket_type_id;

COMMIT;

-- ==============================================================================
-- Verification Summary
-- ==============================================================================
SELECT 
  e.id, 
  e.title, 
  e.category, 
  v.name AS venue_name,
  COUNT(DISTINCT es.id) AS total_future_sessions,
  COUNT(DISTINCT si.id) AS total_seats_in_inventory,
  SUM(CASE WHEN si.status = 'available' THEN 1 ELSE 0 END) AS available_seats,
  SUM(CASE WHEN si.status = 'booked' THEN 1 ELSE 0 END) AS booked_seats
FROM events e
JOIN venues v ON e.venue_id = v.id
LEFT JOIN event_sessions es ON es.event_id = e.id
LEFT JOIN seat_inventory si ON si.session_id = es.id
WHERE e.slug IN (
  'pushpa-2-the-rule', 'juna-furniture', 'kantara-chapter-1', 
  'baipan-bhaari-deva-2', 'avatar-fire-and-ash', 'punha-sahi-re-sahi', 
  'jar-tar-chi-goshta', 'albattya-galbattya', 'natsamrat', 
  'ghashiram-kotwal', 'vasantotsav-2026'
)
GROUP BY e.id, e.title, e.category, v.name
ORDER BY e.id;
